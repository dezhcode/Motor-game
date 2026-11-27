import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('studio_apk', Path(__file__).parents[1] / 'verify-studio-apk.py')
studio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)


class StudioApkTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'public'
        (self.source / 'assets').mkdir(parents=True)
        (self.source / 'index.html').write_text('<script src="./assets/game.js"></script>')
        (self.source / 'assets/game.js').write_bytes(b'const studioVersion = 123;')
        self.manifest = studio.snapshot(self.source, 'studio-commit')

    def apk(self, change=None, remove=None, extra=False):
        path = self.root / 'test.apk'
        with zipfile.ZipFile(path, 'w') as z:
            for relative in self.manifest['files']:
                if relative != remove:
                    z.writestr('assets/public/' + relative, b'wrong version' if relative == change else (self.source / relative).read_bytes())
            if extra:
                z.writestr('assets/public/old-game.js', b'old')
            z.writestr('classes.dex', b'native wrapper')
        return path

    def test_exact_studio_bundle_is_accepted(self):
        self.assertTrue(studio.verify(self.manifest, self.apk())['apk_verified'])

    def test_rebuilt_or_changed_game_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'changed the Studio file'):
            studio.verify(self.manifest, self.apk(change='assets/game.js'))

    def test_missing_and_stale_files_are_rejected(self):
        for kwargs in [{'remove': 'assets/game.js'}, {'extra': True}]:
            with self.subTest(kwargs=kwargs), self.assertRaisesRegex(ValueError, 'asset list differs'):
                studio.verify(self.manifest, self.apk(**kwargs))

    def test_incomplete_studio_export_is_rejected(self):
        (self.source / 'assets/game.js').unlink()
        with self.assertRaisesRegex(ValueError, 'missing file'):
            studio.snapshot(self.source, 'studio-commit')


if __name__ == '__main__':
    unittest.main()
