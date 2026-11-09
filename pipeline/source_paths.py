"""Resolve equivalent Croatian filenames across macOS, Windows and Linux."""

from pathlib import Path
import unicodedata


def resolve_source_path(path: Path) -> Path:
    if path.is_file():
        return path
    expected = unicodedata.normalize("NFC", path.name)
    matches = [
        candidate for candidate in path.parent.iterdir()
        if candidate.is_file() and unicodedata.normalize("NFC", candidate.name) == expected
    ]
    if len(matches) != 1:
        raise FileNotFoundError(f"Expected one source file: {path}; found {len(matches)}")
    return matches[0]
