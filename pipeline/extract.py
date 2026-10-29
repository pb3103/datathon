"""Strict read-only extraction of Prilog 1. Decimal values come from original XML."""

from __future__ import annotations
import hashlib
import json
import re
import unicodedata
import uuid
import zipfile
from collections import Counter
from dataclasses import asdict, dataclass, field
from decimal import Decimal, InvalidOperation, localcontext
from pathlib import Path
from xml.etree import ElementTree as ET
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
MAPS = json.loads((ROOT / "pipeline/config/year_maps.json").read_text())
ALIASES = json.loads((ROOT / "pipeline/config/aliases.json").read_text())
PARSER_VERSION = "1.0.0"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NAMESPACE = uuid.UUID("a754d631-aecf-4ae6-b31c-3f5c5aed4297")
MISSING = {"", "-", "–", "—"}


def normalize_name(value: str) -> str:
    return unicodedata.normalize("NFC", value).strip().casefold()


def clean_county(value: str) -> str:
    return re.sub(r"^\d+\.\s*", "", unicodedata.normalize("NFC", value).strip())


def canonical_identity(county: str, name: str, year: int):
    county = clean_county(county)
    name = unicodedata.normalize("NFC", name).strip()
    reason = "Exact name + county against 2021 baseline; no fuzzy matching."
    for alias in ALIASES:
        if (
            year == alias["year"]
            and normalize_name(county) == normalize_name(alias["county"])
            and normalize_name(name) == normalize_name(alias["source_name"])
        ):
            name, reason = alias["canonical_name"], alias["reason"]
    key = (normalize_name(county), normalize_name(name))
    return uuid.uuid5(NAMESPACE, "|".join(key)), county, name, key, reason


def parse_decimal(value: str | None, *, text_cell: bool = False) -> Decimal | None:
    """XML numerics use '.', textual Croatian values use ',' and grouped '.'."""
    if value is None or value.strip() in MISSING:
        return None
    token = value.strip().replace("\u00a0", "").replace(" ", "")
    if text_cell:
        if "," in token:
            if not re.fullmatch(r"[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+", token):
                raise ValueError(f"Nevaljan hrvatski broj: {value!r}")
            token = token.replace(".", "").replace(",", ".")
        elif re.fullmatch(r"[+-]?\d{1,3}(?:\.\d{3})+", token):
            token = token.replace(".", "")
    try:
        result = Decimal(token)
    except InvalidOperation as exc:
        raise ValueError(f"Nevaljan broj: {value!r}") from exc
    if not result.is_finite():
        raise ValueError("Broj mora biti konačan.")
    return result


@dataclass
class Issue:
    code: str
    severity: str
    description: str
    details: dict = field(default_factory=dict)


@dataclass
class Row:
    source_row: int
    raw_values: dict
    municipality_id: uuid.UUID | None = None
    name: str | None = None
    county: str | None = None
    key: tuple | None = None
    alias_reason: str = ""
    total_t: Decimal | None = None
    mixed_t: Decimal | None = None
    covered_population: int | None = None
    published_kg_per_capita: Decimal | None = None
    published_separate_collection_pct: Decimal | None = None
    population_usable: bool = True
    issues: list[Issue] = field(default_factory=list)

    @property
    def rejected(self):
        return any(i.severity == "error" for i in self.issues)


def check_row(row: Row, config: dict):
    t, m, p, f, g = (
        row.total_t,
        row.mixed_t,
        row.covered_population,
        row.published_kg_per_capita,
        row.published_separate_collection_pct,
    )
    for name, value in [("total_t", t), ("mixed_t", m), ("published_kg_per_capita", f)]:
        if value is not None and value < 0:
            row.issues.append(Issue("negative_value", "error", f"{name} je negativan."))
    if p is not None and p <= 0:
        row.issues.append(
            Issue("invalid_population", "error", "Obuhvaćena populacija mora biti > 0.")
        )
    if t is not None and m is not None and m > t:
        row.issues.append(Issue("mixed_gt_total", "error", "Miješano je veće od ukupnog."))
    if g is not None and not 0 <= g <= 100:
        row.issues.append(Issue("rate_out_of_range", "error", "Stopa nije u rasponu 0–100."))
    if row.rejected:
        return
    for name, value in [
        ("total_t", t),
        ("mixed_t", m),
        ("covered_population", p),
        ("published_kg_per_capita", f),
        ("published_separate_collection_pct", g),
    ]:
        if value is None:
            row.issues.append(
                Issue("missing_value", "warning", f"Nema podatka: {name}.", {"field": name})
            )
    row.population_usable = p is not None and p > 0
    h, kh, gh = (Decimal(config[k]) for k in ("mass_half", "kg_half", "rate_half"))
    # XLSX XML serialisation can contain e.g. 273.32999999999998; epsilon is
    # far below the published 0.01 unit and never a data-quality tolerance.
    eps = Decimal("0.00000001")
    with localcontext() as ctx:
        ctx.prec = 40
        if t is not None and p and f is not None:
            lo, hi = 1000 * (t - h) / p - kh - eps, 1000 * (t + h) / p + kh + eps
            if not lo <= f <= hi:
                row.population_usable = False
                row.issues.append(
                    Issue(
                        "kg_per_capita_mismatch",
                        "warning",
                        "Objavljeni kg/stan. nije usklađen s T i P unutar preciznosti izvora; nazivnik zahtijeva pregled.",
                        {
                            "published": str(f),
                            "derived": str(1000 * t / p),
                            "allowed_min": str(lo),
                            "allowed_max": str(hi),
                        },
                    )
                )
        if t is not None and m is not None and g is not None and t > h:
            lo, hi = (
                100 * (1 - (m + h) / (t - h)) - gh - eps,
                100 * (1 - (m - h) / (t + h)) + gh + eps,
            )
            if not lo <= g <= hi:
                row.issues.append(
                    Issue(
                        "separate_collection_rate_mismatch",
                        "warning",
                        "Objavljena stopa nije usklađena s masama unutar preciznosti izvora.",
                        {"published": str(g), "derived": str(100 * (t - m) / t)},
                    )
                )


def extract(path: Path, year: int) -> list[Row]:
    config = MAPS[str(year)]
    # openpyxl supplies sheet/number format validation; original XML supplies
    # exact numeric lexemes so JSON staging never passes through binary float.
    book = load_workbook(path, read_only=True, data_only=False)
    try:
        if config["sheet"] not in book.sheetnames:
            raise ValueError(f"Nedostaje očekivani list {config['sheet']}")
        if year == 2022 and "%" not in book[config["sheet"]]["G2"].number_format:
            raise ValueError("2022. G mora imati očekivani postotni Excel format.")
    finally:
        book.close()
    with zipfile.ZipFile(path) as z:
        strings = (
            [
                "".join(t.text or "" for t in e.findall(".//m:t", NS))
                for e in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)
            ]
            if "xl/sharedStrings.xml" in z.namelist()
            else []
        )
        sheets = ET.fromstring(z.read("xl/workbook.xml")).findall("m:sheets/m:sheet", NS)
        sheet = next(s for s in sheets if s.get("name") == config["sheet"])
        rels = {
            r.get("Id"): r.get("Target")
            for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        }
        target = rels[
            sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        ]
        root = ET.fromstring(
            z.read(target.lstrip("/") if target.startswith("/") else "xl/" + target)
        )
    rows = []
    headers = None
    for xmlrow in root.findall("m:sheetData/m:row", NS):
        raw = {}
        for cell in xmlrow.findall("m:c", NS):
            col = re.sub(r"\d+", "", cell.get("r"))
            value = cell.find("m:v", NS)
            token = value.text if value is not None else None
            kind = cell.get("t", "n")
            if kind == "s":
                token = strings[int(token)]
            elif kind == "inlineStr":
                token = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
            raw[col] = {"value": token, "type": kind, "formula": cell.find("m:f", NS) is not None}
        if not any(v["value"] not in ("", None) or v["formula"] for v in raw.values()):
            continue
        rn = int(xmlrow.get("r"))
        if headers is None:
            headers = {c: v["value"] for c, v in raw.items() if v["value"] not in ("", None)}
            if rn != 1 or headers != config["headers"]:
                raise ValueError(
                    f"Promijenjeno zaglavlje u {path}, redak {rn}; potreban pregled mape."
                )
            continue
        row = Row(rn, raw)
        try:
            if any(v["formula"] or v["type"] == "e" for v in raw.values()):
                raise ValueError(
                    "Formula ili Excel pogreška zahtijeva pregled; cached vrijednost nije prihvaćena."
                )
            a, b = (raw.get(c, {}).get("value") for c in "AB")
            if not a or not b:
                raise ValueError("Nedostaje županija ili naziv JLS.")
            row.municipality_id, row.county, row.name, row.key, row.alias_reason = (
                canonical_identity(a, b, year)
            )
            values = [
                parse_decimal(
                    raw.get(c, {}).get("value"),
                    text_cell=raw.get(c, {}).get("type", "n") in ("s", "str", "inlineStr"),
                )
                for c in "CDEFG"
            ]
            t, m, p, f, g = values
            if p is not None and (p != p.to_integral_value() or p > 2147483647):
                raise ValueError("Populacija nije valjan cijeli broj.")
            # NUMERIC(24,12) provides 12 integer digits and much more precision
            # than published source; preserve exact XML separately in raw_values.
            if any(v is not None and abs(v) >= Decimal("1e12") for v in values):
                raise ValueError("Vrijednost izvan podržanog raspona NUMERIC(24,12).")
            row.total_t, row.mixed_t, row.covered_population = (
                t,
                m,
                int(p) if p is not None else None,
            )
            row.published_kg_per_capita = f
            row.published_separate_collection_pct = (
                g * config["rate_multiplier"] if g is not None else None
            )
            check_row(row, config)
        except (ValueError, InvalidOperation) as exc:
            row.issues.append(Issue("parse_error", "error", str(exc)))
        rows.append(row)
    if headers is None:
        raise ValueError("Prazan list bez zaglavlja.")
    counts = Counter(r.key for r in rows if r.key is not None)
    for row in rows:
        if row.key is not None and counts[row.key] > 1:
            row.issues.append(
                Issue(
                    "duplicate_jls",
                    "error",
                    "Svi retci ponovljenog ključa stavljeni su u karantenu.",
                )
            )
    return rows


def load_sources(data_dir: Path, manifest_path: Path):
    manifest = json.loads(manifest_path.read_text())
    result = []
    for year in sorted(int(y) for y in MAPS):
        entries = [m for m in manifest if m["year"] == year and m["path"].endswith(".xlsx")]
        if len(entries) != 1:
            raise ValueError(f"Očekivan točno jedan XLSX u manifestu za {year}.")
        entry = entries[0]
        path = data_dir / str(year) / Path(entry["path"]).name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            raise ValueError(f"Checksum nije jednak pregledanom manifestu: {path}")
        result.append((entry, extract(path, year)))
    baseline = {r.key for r in result[0][1] if not r.rejected}
    if not baseline:
        raise ValueError("Nema valjanog baznog registra za 2021.")
    for entry, rows in result:
        for row in rows:
            if row.key is not None and row.key not in baseline:
                row.issues.append(
                    Issue(
                        "unresolved_jls",
                        "error",
                        "Naziv + županija nije u baznom registru 2021.; potreban pregled aliasa.",
                    )
                )
    return result


def json_default(value):
    if isinstance(value, (Decimal, uuid.UUID)):
        return str(value)
    if hasattr(value, "__dataclass_fields__"):
        return asdict(value)
    raise TypeError(type(value).__name__)
