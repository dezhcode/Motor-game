import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('development_apk', Path(__file__).parents[1] / 'verify-development-apk.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DevelopmentApkVerificationTests(unittest.TestCase):
    def fixture(self, root, altered=False, stale=False, server=False, app_id='com.aistudio.kavirsavar.qmxzpk.test'):
        dist = root / 'dist'
        (dist / 'assets').mkdir(parents=True)
        (dist / 'index.html').write_text('<script src="./assets/game.js"></script>')
        (dist / 'assets/game.js').write_text('window.gameVersion="painted-desert";')
        (dist / 'build-info.json').write_text(json.dumps({'commit': 'test-source'}))
        apk = root / 'test.apk'
        with ZipFile(apk, 'w') as z:
            for p in dist.rglob('*'):
                if p.is_file():
                    data = p.read_bytes()
                    if altered and p.name == 'game.js':
                        data += b'// different game'
                    z.writestr('assets/public/' + p.relative_to(dist).as_posix(), data)
            z.writestr('assets/capacitor.config.json', json.dumps({'appId': app_id, 'server': {'url': 'https://example.invalid'} if server else {}}))
            z.writestr('assets/public/cordova.js', '')
            if stale:
                z.writestr('assets/public/assets/old-game.js', 'old')
        return apk, dist

    def test_exact_bundle_is_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            apk, dist = self.fixture(Path(tmp))
            self.assertEqual(module.verify(apk, dist)['fileCount'], 3)

    def test_changed_stale_or_remote_bundles_are_rejected(self):
        for options in [{'altered': True}, {'stale': True}, {'server': True}, {'app_id': 'com.aistudio.kavirsavar.qmxzpk'}]:
            with self.subTest(options=options), tempfile.TemporaryDirectory() as tmp:
                apk, dist = self.fixture(Path(tmp), **options)
                with self.assertRaises(ValueError):
                    module.verify(apk, dist)
