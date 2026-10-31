# Završna provjera širokog udjela za 2019.

## Zaključak i korekcija prethodne procjene

**Ukupna masa T i miješana masa M iz Priloga 1 opravdavaju izračun zasebnog širokog udjela otpada izvan miješanog toka za svih 556 JLS.** Prethodna blokada bila je preoprezna: različite oznake javne/povezane usluge pročitane su kao prepreka, bez dovoljnog povezivanja definicije organizacije JLS sa širokom podjelom tokova u Tablici 11. Ne mijenja se zaključak da ovaj udio nije uža stopa prema Uredbi niti recikliranje.

Relevantni primarni izvor: `podaci/2019/OTP_Izvješće o komunalnom otpadu za 2019_rev2_0.pdf` (stvarna putanja i SHA-256 zapisani u JSON-u).

- **Str. 12:** „Sakupljeno u organizaciji JLS” definirano je kao sakupljeno u sklopu javne usluge i usluge povezane s javnom uslugom.
- **Str. 13–14, Tablice 1 i 2:** jasno se razlikuju 37% RH, 21% u organizaciji JLS (sve vrste osim MKO) i 14% prema Uredbi.
- **Str. 34, Tablica 11 i bilješke 21/22:** ukupni tok u organizaciji JLS dijeli se na MKO i sve ostale vrste osim MKO ključnog broja 20 03 01. Time je M odgovarajuća miješana sastavnica šire ukupne mase T; nazivi ne zahtijevaju da je T ograničen isključivo na SO-1.
- **Str. 119–135, Prilog 1, Tablica 27:** upravo iz ove tablice dolaze T (javna i povezana usluga), M (MKO javne usluge SO-1), P i kg/stanovnik po JLS.
- **Str. 39–40:** uža stopa prema Uredbi izuzima određene složene vrste iz brojnika i nazivnika. Zato se udio `(T−M)/T` ne naziva tom stopom i 14% nije validacijski cilj.

Zaključak se oslanja na definicije i podjelu tokova, ne samo na brojčanu blizinu 21%. Nije potvrđena međugodišnja usporedivost ili neovisna točnost svake izvorne prijave.

## Kontrola izvora i redaka

Ponovno je pokrenuta **read-only PDFKit ekstrakcija svih 17 stranica Priloga 1 za 2019.** i postojeći geometrijski parser `pipeline.verify_historical`. Svih 556 rekonstruiranih identiteta i četiriju numeričkih polja podudara se s pregledanim manifestom `historical_verification.json`. Izvorne datoteke nisu mijenjane.

Novi reproducibilni audit `pipeline.audit_2019_share` provjerava CSV/PDF checksumove, 556 jedinstvenih JLS i redaka, točno podudaranje svih T/M parova s pregledanom PDF evidencijom, populaciju te valjanost izračuna. Nema nedostajućih/negativnih masa, M>T, dvostrukih JLS niti novih pogrešaka izdvajanja masa. Ranije dokumentiranih 25 ispravaka objavljenih kg/stanovnik ostaje isključivo u obrađenim podacima i nije nova korekcija T ili M.

Primjeri obuhvaćaju Zagreb, Split i male općine iz najmanje deset županija; nije pregledan samo uzorak nego svi redci.

| JLS | Županija | PDF stranica | T (t) | M (t) | Izračunati široki udio (%) |
|---|---|---:|---:|---:|---:|
| Split | Splitsko-dalmatinska | 131 | 69247.98 | 58666.73 | 15.2802 |
| Zagreb | Grad Zagreb | 135 | 258465.05 | 200923.6 | 22.2628 |
| Severin | Bjelovarsko-bilogorska | 124 | 57.76 | 44.62 | 22.7493 |
| Dragalić | Brodsko-posavska | 126 | 118.72 | 110.09 | 7.2692 |
| Janjina | Dubrovačko-neretvanska | 134 | 750.0 | 750.0 | 0.0000 |
| Lanišće | Istarska | 133 | 119.14 | 103.5 | 13.1274 |
| Ribnik | Karlovačka | 122 | 103.49 | 94.81 | 8.3873 |
| Kalnik | Koprivničko-križevačka | 123 | 140.69 | 95.84 | 31.8786 |
| Novi Golubovec | Krapinsko-zagorska | 120 | 85.96 | 68.54 | 20.2652 |
| Lovinac | Ličko-senjska | 125 | 256.0 | 256.0 | 0.0000 |
| Dekanovec | Međimurska | 134 | 194.7 | 60.29 | 69.0344 |
| Levanjska Varoš | Osječko-baranjska | 129 | 91.64 | 81.44 | 11.1305 |
| Berek | Bjelovarsko-bilogorska | 124 | 175.57 | 169.66 | 3.3662 |

## Kontrola agregata

Prilog 1, zbrojeno po svih 556 JLS:

- T = **1.372.385,76 t**;
- M = **1.086.393,41 t**;
- T−M = **285.992,35 t**;
- maseno ponderirani udio `100 × (ΣT−ΣM)/ΣT` = **20,83906423%**, što se zaokružuje na **21%**. Ovo nije aritmetički prosjek JLS postotaka.

Tablica 11 na str. 34 objavljuje T=1.372.358 t, M=1.086.872 t, ostalo=285.486 t i 21%. Omjer tih objavljenih masa je 20,80258941%. Razlika našeg agregiranog udjela prema omjeru objavljenih masa iznosi **+0,03647482 postotnih bodova**, a prema zaokruženih 21% **−0,16093577 pb**.

Postoji stvarna razlika među tablicama: **+27,76 t ukupno i −478,59 t miješano**. To nije objašnjeno samim zaokruživanjem: pola koraka za 556 lokalnih masa na 0,01 t daje 2,78 t, uz dodatnu preciznost agregatne tablice. Razlika u miješanoj masi osobito nadilazi takvu pretpostavku. Uzrok nije potvrđen; ne pripisuje se proizvoljno ekstrakciji, lokalnoj prijavi ili reviziji. Lokalni T/M podaci potvrđeni su u vlastitoj izvornoj tablici i nisu skalirani da bi se agregati izjednačili.

**Zbroj lokalnih redaka je izračunati kontrolni agregat, a ne službeno potvrđeni nacionalni ukupni otpad RH.** Blizina 21% jest dodatna kontrola širokog pokazatelja, a ne zamjena za provjeru definicije.

## Ciljana implementacija

Postojeći `historical_share` proširen je odobrenom 2019. uz iste provjere godine, obuhvata, checksuma, konačnosti masa, T>0 i 0≤M≤T. Nije uvedena tolerancija koja bi propustila M>T. Izračun ostaje Decimal preciznosti 40; nedostupni ili nevaljani ulazi ne daju izmišljenu nulu.

2019. sada dobiva **556 izračunatih udjela** u zasebnom API ključu `calculated_nonmixed_share_pct`; ukupno povijesnih udjela postaje 2.224. `separate_collection_pct` i dalje za povijesne godine nije popunjen. Explorer i Compare koriste postojeće kartice, badge „Izračunato”, tooltipe, tablice i grafove. Razlike za istu 2019. ostaju u postotnim bodovima; Zagreb 22,26%, Split 15,28%, Split minus Zagreb −6,98 pb. Nema međugodišnjeg zaključka o napretku.

Ažurirani su samo kontekstualni metodološki tekstovi; nije mijenjan dizajn niti dodana nova kartica upozorenja. Simulator, službene stope 2021.–2024. i izračuni drugih godina ostaju isti. Nisu potrebni migracija ili ponovni uvoz.

## Datoteke i reprodukcija

- Izračun: `backend/app/historical_share.py`.
- Prikazni tekstovi: `frontend/src/components/DataNotes.tsx`, `MetricCards.tsx`, `Sources.tsx`.
- Provjere: `pipeline/audit_2019_share.py`, `pipeline/verify_history_api.py`, `tests/test_historical.py`, `tests/test_historical_share.py`, `frontend/e2e/historical.spec.ts`, `ruff.toml`.
- Dokumentacija: ovaj izvještaj, `docs/collection_rate_methodology.md`, `docs/historical_shares.md`, `README.md`; JSON evidencija `2019_share_validation.json` i `2019_share_api_verification.json`.

```sh
python3 -m pipeline.audit_2019_share > docs/2019_share_validation.json
# Nakon obnove API imagea, uz pokrenutu aplikaciju:
docker compose exec -T api python -m pipeline.verify_history_api > docs/2019_share_api_verification.json
```

Audit koristi pregledani manifest PDF dokaza; svježa ekstrakcija obnavlja se postojećim PDFKit alatom i naredbom `pipeline.verify_historical`, prema README-u. Nema PDF obrade tijekom korisničkog zahtjeva.

## Rezultati testova

- **72 backend/podatkovna testa prošla**; uključeni su 2019. izračun, valjane/nevaljane i nedostajuće mase, provjera izvora/revizije, svih 556 PDF parova te agregat i uzorci. Nakon dodatne kontrole populacije i jedinstvenosti CSV redaka prošlo je i 18 ciljanih testova povijesnog udjela.
- **5 frontend unit testova prošlo**; odabir izračunate nasuprot objavljenoj metriki ostaje odvojen.
- **32 Playwright browser testa prošla (46,1 s)** preko stvarnog API-ja i baze. Novi test provjerava Zagreb/Split 2019., razliku −6,98 pb, prikaz kroz godine, izvore i činjenicu da objavljena povijesna stopa ostaje prazna. Postojeći tokovi uključuju mobitel/tablet/desktop, axe pristupačnost, kontekstualnu napomenu, službene stope, navigaciju i Simulator 2023./2024.
- TypeScript, produkcijski build, Ruff, Prettier i `git diff --check` prolaze.
- Live API audit svih **4.448 opažanja i 31.192 ćelije metrika** prolazi: ukupno 2.224 izračunata povijesna udjela i 2.224 objavljene stope, isti pokazatelji u Exploreru/Compareu, Simulator nije proširen.

Početno browser izvršavanje otkrilo je dvije testne pretpostavke: provjera promjene širine radila je prije dovršetka prilagodbe grafa, a novi test koristio je ASCII crticu umjesto postojećeg tipografskog minusa. Testovi sada čekaju stabilnu širinu i provjeravaju stvarni znak minusa; dizajn i formatiranje aplikacije nisu mijenjani. Poznato upozorenje Starlette/AnyIO o zastarjelom aliasu ostaje bez pada testova.
