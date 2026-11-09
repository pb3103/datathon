from pathlib import Path
import unicodedata

import pytest

from pipeline.source_paths import resolve_source_path


@pytest.mark.parametrize("stored,requested", [("NFC", "NFD"), ("NFD", "NFC")])
def test_resolves_equivalent_unicode_filename(tmp_path: Path, stored, requested):
    name = "Izvješće.pdf"
    actual = tmp_path / unicodedata.normalize(stored, name)
    actual.write_bytes(b"reviewed source")
    result = resolve_source_path(tmp_path / unicodedata.normalize(requested, name))
    assert result.read_bytes() == b"reviewed source"
    assert result == actual


def test_missing_source_is_not_substituted(tmp_path: Path):
    (tmp_path / "other.pdf").write_bytes(b"unrelated")
    with pytest.raises(FileNotFoundError):
        resolve_source_path(tmp_path / "Izvješće.pdf")
