# Izračunati udjeli izvan miješanog toka — 2017.–2020.

> Završna provjera Rev2 odobrila je i 2019. za svih 556 JLS. Aktualni obuhvat: 2.224 izračunata udjela za 2017.–2020. [Dokazi i rezultati](2019_share_methodology.md). Prethodne brojke i blokada 2019. u opisu početne implementacije ispod ostaju povijesna evidencija, a ne aktualno ponašanje.

## Pokazatelj i odnos prema prethodnom auditu

Novi zahtjev izričito traži **široki udio otpada izvan miješanog toka**, a ne rekonstrukciju službene stope odvojenog sakupljanja. Prethodni `collection_rate_methodology.md` ostaje evidencija provjere službenih stopa i njihovih užih definicija. Ova implementacija ne povlači zaključak da su te definicije ekvivalentne novom pokazatelju.

Formula: `100 × (T−M)/T`. T i M su objavljene tone iz istog provjerenog JLS retka, uz PDF korekcije dokumentirane prethodnim uvozom. Izračun se izvodi u API-ju Decimal aritmetikom (preciznost 40), bez izmjene izvora ili ponovnog računanja u pregledniku.

## Metodološka odluka

| Godina | Dostupne izračunate vrijednosti | Obrazloženje |
|---|---:|---|
| 2017. | 556 | PDF Tablica 106, str. 92–101: ukupni i miješani otpad u istom pregledanom JLS/SO-1 prikazu. Razlika je široki nemiješani tok, uključujući moguće složene vrste. Nije uža službena stopa opisana na str. 25. |
| 2018. | 556 | PDF Tablica 90, str. 95–104: oba stupca u istom pregledanom JLS prikazu. Široki udio ne poistovjećuje se s definicijom koja isključuje složene vrste niti izračunom za poticajnu naknadu. |
| 2019. | 556 | Tablica 27, str. 119–135: javna i povezana usluga zajedno čine organizaciju JLS (definicija str. 12). Tablica 11, str. 34, potvrđuje široku podjelu na MKO i ostale tokove. Nije uža stopa prema Uredbi. |
| 2020. | 556 | Tablica 89, str. 104–113, oba stupca u organizaciji JLS; str. 31 opisuje široki udio svih vrsta osim MKO. Nije potvrđena izravna međugodišnja usporedivost. |

Ukupno **2.224 izračunate vrijednosti**. Broj potvrđuje stvarni API audit svih 556 JLS i osam godina. Nikakva administrativna granica ili lokalni kontinuitet usluge nije time dodatno potvrđen.

Provjerava se godina, obuhvat i checksum odobrenog CSV izvora. Nova/nepotvrđena revizija, nedostajuće ili nekonačne mase, T≤0, M<0 ili M>T daju nedostupnost s razlogom. Pravi rezultat 0% ostaje nula. Sporna populacija ne blokira maseni udio jer nije njegov nazivnik; postojeća upozorenja populacije ostaju.

## API i usporedbe

`calculated_nonmixed_share_pct` je zaseban ključ. `separate_collection_pct` ostaje isključivo objavljena stopa, s nepromijenjenim vrijednostima 2021.–2024. Za 2019. izvedeni ključ sada je dostupan nakon završne provjere obuhvata; za 2021.–2024. nije primjenjiv. Baza, ETL, mase i objavljeni pokazatelji nisu mijenjani. Postojeći dijagnostički ključevi u API-ju nisu službene stope.

Compare uključuje novi ključ u katalog i obračun razlike unutar iste godine/usklađenog obuhvata. Razlika je u postotnim bodovima. Izračunati udjeli ne ulaze u automatske uvide ili simulacijske ciljeve. Nema usporedbe razlike između dviju godina ili zaključka o poboljšanju.

## Prikaz

Explorerov odabir „Udjeli i stope (%)” ima dvije odvojene serije: prugasti stupci „Izračunato · udio izvan miješanog toka” i puni zeleni „Službeno objavljeno · stopa odvojenog sakupljanja”. Isto razlikovanje postoji u legendi, tooltipu i tablici. Stupci nisu povezani linijom preko metodoloških prekida.

Compareov prikaz stopa za povijesnu godinu dohvaća zaseban izvedeni ključ; za novije godine objavljeni. Tooltip i oznake objašnjavaju podrijetlo; tablica označuje povijesne i novije stupce. Povijesni nedostupni rezultat nije nula. Napomena o neizravnoj usporedivosti prikazuje se samo u relevantnom prikazu; za 2019. detalji objašnjavaju razliku između širokog udjela i uže stope prema Uredbi. Proširivi detalji daju JLS, godinu, obje mase, formulu, izvorni naziv/putanju, redak i poveznicu prema podrijetlu.

Simulatorovi modeli, vremenski obuhvat 2023./2024. i metodološki manifest nisu mijenjani. Upozorenja koja su bila aktivna prije ovog zadatka ostaju; ova promjena ne vraća ranije uklonjene opće kartice XLSX/PDF agregata.

## Provjere početne implementacije (povijesna evidencija)

Prošlo je **64 backend/podatkovnih testova**, uključujući 10 novih provjera izračuna, nedostajućih/nevaljanih ulaza, prave nule, revizije i obuhvata. Nakon dodatnog jačanja API tvrdnji prošlo je i 14 ciljanih povijesnih testova. Prošlo je **5 frontend unit testova** i **30 browser testova** preko stvarnog API-ja (54,4 s), uključujući novi tok izvedenih udjela, odvojene oznake podrijetla, ulazne mase/izvore, nedostupnu 2019., mobilni prikaz i axe pristupačnost. Regresijski tokovi Explorera, Comparea i Simulatora, izvoz i ispis prolaze. TypeScript, produkcijski build, Prettier, Ruff i `git diff --check` prolaze.

Cjelovita live API kontrola svih 4.448 opažanja potvrđuje 1.668 dostupnih izvedenih udjela i 2.224 nepromijenjene objavljene stope te podudarnost Explorera i Comparea u 31.192 provjerene ćelije metrika (uključujući preklapanje zadnje grupe). `docs/historical_share_api_verification.json` sadrži cjeloviti audit API-ja (4.448 opažanja), provjeru izračuna, blokadu 2019. i jednakost dostupnih pokazatelja Explorera i Comparea. Izvorna validacija 2.224 novijih stopa ostaje u `collection_rate_validation.json`.


## Izmijenjene datoteke

- Backend: `backend/app/historical_share.py`, `backend/app/observations.py`, `backend/app/comparison.py`.
- Frontend: `frontend/src/App.tsx`, `frontend/src/components/Trends.tsx`, `frontend/src/components/MetricCards.tsx`, `frontend/src/components/RateEvidence.tsx`, `frontend/src/compare/Compare.tsx`, `frontend/src/compare/CompareCharts.tsx`, `frontend/src/domain.ts`, `frontend/src/styles.css`.
- Provjere: `tests/test_historical_share.py`, `tests/test_historical.py`, `frontend/tests/domain.test.ts`, `frontend/e2e/historical.spec.ts`, `pipeline/verify_history_api.py`, `docs/historical_share_api_verification.json`.
- Dokumentacija: `README.md`, ovaj izvještaj.

Izvorne CSV/XLSX/PDF datoteke, ETL i Simulator nisu mijenjani. Nije potrebna migracija baze ni novi uvoz. Postojeći `historical_api_verification.json` ostaje prethodna auditna snimka; novi izvještaj bilježi sadašnju blokadu 2019. i 1.668 dostupnih izvedenih udjela.


Završna provjera 2019. i aktualni rezultati dostupnosti zamjenjuju prvotnu blokadu: [metodološki izvještaj](2019_share_methodology.md), [retci i agregat](2019_share_validation.json), [aktualni live API audit](2019_share_api_verification.json). Prethodni JSON auditi ostaju nepromijenjeni radi sljedivosti.
