"""Restore only this Guide redesign; stop if any affected file changed afterwards."""
import hashlib
import json
from pathlib import Path
import tarfile

folder = Path(__file__).resolve().parent
root = folder.parent.parent
manifest = json.loads((folder / 'restore-manifest.json').read_text())
for relative, expected in (manifest['restore'] | manifest['remove']).items():
    path = root / relative
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise SystemExit(f'Zaustavljeno: {relative} promijenjen je nakon redizajna. Potreban je ručni pregled; ništa nije vraćeno.')
with tarfile.open(folder / 'before-source.tar.gz') as archive:
    for relative in manifest['restore']:
        (root / relative).write_bytes(archive.extractfile(relative).read())
for relative in manifest['remove']:
    (root / relative).unlink()
print('Prethodni Waste Guide je vraćen. Ostale datoteke i Git stanje nisu mijenjani. Ponovno pokrenite frontend build.')
