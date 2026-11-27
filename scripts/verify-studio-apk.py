"""Record the committed Studio web export and verify its bytes inside the native APK."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def snapshot(source, commit):
    source = Path(source)
    entry = source / 'index.html'
    if not entry.is_file():
        raise ValueError(f'Studio export missing: {entry}. Export the updated app from Studio before pushing.')
    files = {}
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Symlinks are not supported: {path}')
        if path.is_file():
            files[path.relative_to(source).as_posix()] = digest(path.read_bytes())
    for ref in re.findall(r'(?:src|href)=["\']([^"\']+)["\']', entry.read_text()):
        if ref.startswith(('https:', 'http:', '//', 'data:', '#')):
            continue
        target = ref.split('?', 1)[0].split('#', 1)[0].removeprefix('./').lstrip('/')
        if target and target not in files:
            raise ValueError(f'Studio index.html references a missing file: {ref}')
    if not any(name.endswith('.js') for name in files):
        raise ValueError('Studio export does not contain a compiled JavaScript bundle.')
    return {'source_directory': source.as_posix(), 'commit': commit, 'algorithm': 'sha256', 'file_count': len(files), 'files': files}


def verify(manifest, apk):
    expected = manifest['files']
    prefix = 'assets/public/'
    with zipfile.ZipFile(apk) as archive:
        names = [item.filename for item in archive.infolist() if not item.is_dir() and item.filename.startswith(prefix)]
        if len(names) != len(set(names)):
            raise ValueError('APK contains duplicate web asset entries.')
        actual = {name[len(prefix):] for name in names}
        missing = set(expected) - actual
        unexpected = actual - set(expected)
        if missing or unexpected:
            raise ValueError(f'APK asset list differs: missing={sorted(missing)}, unexpected={sorted(unexpected)}')
        for relative, sha in expected.items():
            if '..' in PurePosixPath(relative).parts or relative.startswith('/'):
                raise ValueError(f'Invalid manifest path: {relative}')
            if digest(archive.read(prefix + relative)) != sha:
                raise ValueError(f'APK changed the Studio file: {relative}')
    return {**manifest, 'apk_verified': True, 'apk_sha256': digest(Path(apk).read_bytes())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    take = sub.add_parser('snapshot')
    take.add_argument('--source', default='app/src/main/assets/public')
    take.add_argument('--output', default='build/studio-bundle.json')
    check = sub.add_parser('verify')
    check.add_argument('--manifest', default='build/studio-bundle.json')
    check.add_argument('--apk', required=True)
    check.add_argument('--output', default='apk/STUDIO-BUNDLE.json')
    args = parser.parse_args()
    if args.command == 'snapshot':
        commit = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
        result = snapshot(args.source, commit)
    else:
        result = verify(json.loads(Path(args.manifest).read_text()), args.apk)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"Studio export: {result['file_count']} files; commit {result['commit']}; APK verified: {result.get('apk_verified', False)}")


if __name__ == '__main__':
    main()
