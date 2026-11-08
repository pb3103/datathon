"""Restore a saved Guide version, preserving the rest of the working tree."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile

folder = Path(__file__).resolve().parent
root = folder.parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--version', choices=['original', 'before-compact'], default='original')
args = parser.parse_args()
manifest = json.loads((folder / 'restore-manifest.json').read_text())
for relative, expected in manifest.items():
    path = root / relative
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise SystemExit(f'Zaustavljeno bez izmjena: {relative} je naknadno promijenjen. Potreban je ručni pregled.')
archive_path = folder / 'before-source.tar.gz' if args.version == 'before-compact' else folder.parent / 'guide-redesign/before-source.tar.gz'
with tarfile.open(archive_path) as archive:
    contents = {relative: archive.extractfile(relative).read() for relative in manifest}
for relative, content in contents.items():
    (root / relative).write_bytes(content)
print(f'Guide vraćen ({args.version}). Ostale datoteke i Git nisu mijenjani. Ponovno napravite frontend build.')
