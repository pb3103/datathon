# ETL i API — provjera prvog implementacijskog koraka

Provjereno 29. listopada 2026. u ovom checkoutu, kroz Docker Desktop, Python 3.12.11 i PostgreSQL 16.9. Nije korišten SQLite. Ovo nije potvrda dovršenog trodijelnog MVP-a; frontend, Compare i Simulator slijede nakon ovog podatkovnog koraka.

## Rezultat

- Alembic migracija `0001` primijenjena na razvojnu bazu. `alembic check`: `No new upgrade operations detected.`
- Uvezeno 556 JLS i 2.224 aktivna opažanja, po 556 za 2021.–2024.; nema odbijenih redaka ovog pregledanog skupa.
- Pohranjeno 11 problema `kg_per_capita_mismatch` i dva problema izvora `source_aggregate_mismatch`. Problemi nisu pretvoreni u ispravke izvora.
- Ponovljeni CLI uvoz vratio je `skipped / checksum_already_imported` za sve četiri godine, uz iste identifikatore uvoza.
- Testovi: 24 prošla; zatim je dodatno provjerena zaštita aktivacije revizije s izostavljenom JLS i taj test je prošao. Integracijski testovi svaki put koriste novu izoliranu PostgreSQL shemu i stvarnu Alembic migraciju.
- `ruff check .`: sve provjere prošle. `pip check`: nema neusklađenih ovisnosti.
- Stvarni HTTP smoke prošao je na pokrenutom API-ju (`python -m pipeline.smoke_api`): health, pretraga Bjelovara, dostupne godine, profil i izvori. Nisu korišteni mock podaci ni TestClient za taj smoke.
- SHA-256 svih osam izvornih datoteka jednak je manifestu prije implementacije. Izvori ostaju montirani samo za čitanje.

Puna testna provjera zabilježila je jednu neblokirajuću deprecation poruku iz Starlette TestClient / AnyIO kompatibilnog aliasa; svi testovi prolaze.

## Provjereni profil

Interni ID Bjelovara: `2f926aee-008e-515c-ac7c-c1a2a8331c2d`.

`GET /api/v1/municipalities/2f926aee-008e-515c-ac7c-c1a2a8331c2d/observations` vraća:

| Godina | Redak izvora | T u t, zaokruženo za ovaj prikaz | Objavljena stopa odvojenog sakupljanja nakon normalizacije |
|---|---:|---:|---:|
| 2021. | 163 | 11.054,00 | 26 % |
| 2022. | 3 | 9.035,00 | 16 % |
| 2023. | 163 | 9.187,54 | 18,36 % |
| 2024. | 3 | 9.773,87 | 32,27 % |

Izvorna ćelija G iz 2022. u API-ju ostaje `0.16`. Za sva opažanja ciljna stopa simulatora ima `target_rate_available=false` jer metodologija još nije potvrđena. Za Seget 2024. izvedeni kg/stan. vraća `null` s razlogom `population_requires_review`, dok mase i objavljeni kg/stan. ostaju vidljivi uz odgovarajuću kvalitetu.

## Otvoreni rad

React + TypeScript Explorer, zatim objašnjivi Compare v1 i maseni scenariji Simulatora. Još nisu uvezeni materijalni listovi ni ELOO, nije pribavljen službeni registar JLS/ukupne populacije i nisu razriješene metodološke napomene iz audita. Ciljna stopa ostaje zaključana do potvrde. Stopa odvojenog sakupljanja ni u jednom odgovoru nije predstavljena kao recikliranje.

Pokretanje i ponavljanje provjera opisani su u `README.md`.
