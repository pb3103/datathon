"""Copy only manifest-listed input files, verifying hashes and Unicode filenames.

Git stores composed Croatian filenames, while some reviewed manifests use decomposed
names. Linux distinguishes these; macOS usually does not. Package the exact names
expected by the ETL rather than silently skipping files during deployment.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import unicodedata

ROOT = Path(__file__).resolve().parents[1]


def prepare(source_root: Path, output: Path) -> int:
    entries = []
    for manifest in ("source_files.json", "historical_sources.json"):
        entries.extend(json.loads((ROOT / "data/manifests" / manifest).read_text()))
    for entry in entries:
        relative = Path(entry["path"]).relative_to("podaci")
        year = source_root / relative.parent
        matches = [p for p in year.iterdir()
                   if unicodedata.normalize("NFC", p.name) == unicodedata.normalize("NFC", relative.name)]
        if len(matches) != 1:
            raise ValueError(f"Expected one source file: {relative}")
        original = matches[0]
        if hashlib.sha256(original.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError(f"Source checksum mismatch: {relative}")
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, target)
    return len(entries)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "podaci")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(f"Packaged {prepare(args.source, args.output)} verified source files.")


if __name__ == "__main__":
    main()
