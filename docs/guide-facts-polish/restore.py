"""Restore only the facts-tab change, stopping before any later edits are overwritten."""
import hashlib
import json
from pathlib import Path
import tarfile
folder = Path(__file__).resolve().parent
root = folder.parent.parent
manifest = json.loads((folder / 'manifest.json').read_text())
for relative, expected in manifest.items():
    p = root / relative
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest() != expected:
        raise SystemExit(f'Bez izmjena: {relative} je naknadno promijenjen. Potreban je ručni pregled.')
with tarfile.open(folder / 'before.tar.gz') as archive:
    contents = {p: archive.extractfile(p).read() for p in manifest}
for relative, content in contents.items():
    (root / relative).write_bytes(content)
print('Tab Zanimljivosti vraćen na stanje prije zahvata. Ponovno napravite frontend build.')
