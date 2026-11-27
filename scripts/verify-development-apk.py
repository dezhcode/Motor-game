#!/usr/bin/env python3
"""Check that a Capacitor APK contains the exact newly built offline web bundle."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile


def verify(apk: Path, dist: Path) -> dict:
    expected = {p.relative_to(dist).as_posix(): p.read_bytes() for p in dist.rglob('*') if p.is_file()}
    if 'index.html' not in expected or 'build-info.json' not in expected:
        raise ValueError('Web build or source version metadata is missing')
    hashes = {}
    with ZipFile(apk) as archive:
        if archive.testzip() is not None:
            raise ValueError('APK ZIP integrity failure')
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate ZIP entries in APK')
        public = {n.removeprefix('assets/public/'): n for n in names if n.startswith('assets/public/') and not n.endswith('/')}
        for rel, data in expected.items():
            if rel not in public or archive.read(public[rel]) != data:
                raise ValueError(f'Missing or changed web asset: {rel}')
            hashes[rel] = hashlib.sha256(data).hexdigest()
        # Capacitor injects these compatibility bootstrap files during cap sync.
        extra = set(public) - set(expected) - {'cordova.js', 'cordova_plugins.js'}
        if extra:
            raise ValueError(f'Stale or unexpected web assets: {sorted(extra)}')
        config = json.loads(archive.read('assets/capacitor.config.json'))
        if config.get('appId') != 'com.aistudio.kavirsavar.qmxzpk':
            raise ValueError('Unexpected Android app ID')
        if config.get('server', {}).get('url'):
            raise ValueError('APK points to an external server instead of its offline bundle')
    return {'build': json.loads(expected['build-info.json']), 'fileCount': len(hashes), 'sha256': hashes}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--dist', type=Path, default=Path('dist'))
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    report = verify(args.apk, args.dist)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(f"Verified {report['fileCount']} web files byte-for-byte inside {args.apk.name}")
