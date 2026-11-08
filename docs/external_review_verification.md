# WasteWise — provjera vanjske recenzije i ciljane dorade

Datum: 7. studenoga 2026. Recenzija se odnosi na stariju verziju; nije korištena kao razlog za redizajn.

## Početno stanje i zaštita postojećeg rada

- Grana: `main`; HEAD: `0828697898be296906582b3e2e49a8a4e14d2e0e`.
- Zatečene su izmijenjene i nepraćene datoteke, uključujući cijeli Waste Guide, njegove slike, README i ranije izmjene testova. Sačuvane su, bez commita.
- Kontrolna točka: `/tmp/wastewise-review-20261107-183620/`. `baseline.tar.gz` sadrži tadašnje praćene i neignorirane nepraćene datoteke, `changes.patch` zatečeni diff, a `state.json` granu, commit i inventar. `.env` i baza nisu prepisivani.
- Nije rađen reset, čišćenje repozitorija, brisanje volumena, commit, push ni javni deployment. Produkcijska provjera koristi zaseban lokalni Compose projekt `wastewise-render-qa`, s vlastitom privremenom bazom; razvojna baza nije ponovno uvezena.

## A. Rezultati audita

| Točka recenzije | Status | Dokaz i odluka |
|---|---|---|
| A — pretraga bez kvačica i Djakovo/Dakovo | **POTVRĐEN PROBLEM** | API je uspoređivao nazive bez uklanjanja kvačica; lokalna pretraga nije prihvaćala `dj` kao zapis za `đ`. Dodana normalizacija isključivo upita i izraza za pretragu. Službeni nazivi, UUID-ovi, ETL i pohranjeni ključevi ostaju isti. Provjereni puni/djelomični nazivi, case, prazni/nepostojeći upiti, odabir i sva četiri ulaza za pretragu zajednice. |
| B — naziv/adresa ovise o radnom vremenu | **POTVRĐEN PROBLEM** | Popup je koristio zajednički uvjet `hasName && address && hours`. Hvar je zato prikazivao generički naziv umjesto postojećeg naziva i adrese. Polja se sada prikazuju neovisno. |
| B — kontakti i navigacija | **OPRAVDANO UX POBOLJŠANJE** | U postojećem skupu ima 25 kontakata telefonom i 27 web-adresa. Dostupni kontakti prikazani su u popupu; web-poveznice dopuštaju samo HTTP(S), a navigacija samo konačne koordinate u valjanom rasponu. Provjerena su odredišta poveznica; nije provjeravana pouzdanost svakog vanjskog web-poslužitelja. |
| B — radno vrijeme | **POTVRĐEN PROBLEM** | Postoji jedan zapis `"Outside"`, koji nije raspored. Izostavlja se iz prikaza; izvorni zapis ostaje netaknut. Prikazuju se rasporedi s prepoznatljivim vremenom ili `24/7`, uz oznaku da dolaze iz izvora i poziv na provjeru prije dolaska. To nije potvrda aktualnosti rasporeda. |
| B — duplikati i klasifikacija | **ZAHTIJEVA DODATNE PODATKE ILI METODOLOŠKU PROVJERU** | U 283 zapisa nema jednakih ID-jeva ni identičnih parova koordinata. Šest skupina ponovljenih naziva nije dokaz duplikata, osobito za generičke nazive. Zatečena klasifikacija: 208 stalnih, 18 mobilnih dvorišta, 14 otoka i 43 ostale lokacije. Klasifikacija prema stvarnom stanju na terenu nije neovisno potvrđena; ništa nije brisano ili prekvalificirano. |
| C — mobilni odabir godine | **POTVRĐEN PROBLEM** | Na 390 i 320 px kontrola se stiskala na 22 px. Otklonjen sukob širina; kontrola zadržava 92 px i po potrebi prelazi u novi red. Desktop položaj ostaje isti. |
| C — tablica i horizontalno pomicanje | **OPRAVDANO UX POBOLJŠANJE** | Mobilna tablica dobiva minimalnu čitljivu širinu i diskretnu uputu za vodoravno pomicanje. Regija je fokusabilna; test provjerava pomicanje strelicom. Nedostajući materijali za 2019. ostaju „Nema podatka”, bez zamjene nulama. |
| D — gubitak JLS/godine između modula | **VEĆ RIJEŠENO** | Postojeći URL kontekst i regresijski testovi provjeravaju grupu, promjenu godine/JLS, stare reference, Back, reload i nevaljane poveznice. Simulator zadržava postojeću normalizaciju na podržane izvore 2023./2024. Nije uveden novi sustav navigacije. |
| E — apsolutne tone dominiraju uvidima | **OPRAVDANO UX POBOLJŠANJE** | Za Zagreb/Split 2024. isticao se raspon od 183.780,19 t. Sada prednost imaju per-capita pokazatelji, stope i valjani materijalni pokazatelji. Apsolutne mase su dopuna kada nema tri prikladne različite skupine. Formula relativnog raspona, najviše jedna metrika po skupini, deterministička izjednačenja i zaštite kvalitete ostaju isti. Nova oznaka postupka: `normalized-first-relative-range-v2`; opis je usklađen u UI-ju. Algoritam predlaganja sličnih JLS nije mijenjan. |
| F — materijalni tokovi u Exploreru | **ZAHTIJEVA DODATNE PODATKE ILI METODOLOŠKU PROVJERU** | Postoji 15.568 materijalnih opažanja za sedam kategorija 2021.–2024. u `kg/person`, s pojedinačnim provjerama nazivnika. Povijesne godine nemaju taj skup. Obuhvat 2021./2022. uključuje javne spremnike, a 2023./2024. javnu uslugu; kontinuitet nije potvrđen. Postojeći detaljni prikaz u Compareu to već poštuje. Profilni API Explorera ne izlaže materijale. Nije dodan novi endpoint ni graf koji bi kategorije sugerirao kao cjelokupan sastav ili ih pretvarao u tone. Kompaktni prikaz samo jedne provjerene godine moguć je zasebno, ali nije nužan za ovu doradu. |
| G — složeni stupci u Exploreru | **NIJE MOGUĆE REPRODUCIRATI** problem čitljivosti koji bi opravdao zamjenu | Postojeći graf jasno uspoređuje dvije objavljene mase, ima osi, legendu, tablicu i odvojene godine. Zamjena složenim stupcima uvela bi dodatnu izvedenu masu i objašnjenja obuhvata. Ostavljeno postojeće rješenje; izračunati povijesni udjeli i službene stope nisu spojeni u jedinstven trend. |
| H — previše decimala i aktivno stanje Simulatora | **OPRAVDANO UX POBOLJŠANJE** | Glavna kartica izračunate početne stope sada prikazuje dvije decimale umjesto četiri; preciznija kontrolna vrijednost ostaje u detaljima. Aktivni Graf/Tablica ima diskretnu zelenu pozadinu, uključujući hover. Puna preciznost računa nije mijenjana. |
| H — duplicirani pokazatelji, stupci, navigacija i dijeljenje | **VEĆ RIJEŠENO** / bez opravdanja za novu doradu | Objavljena i izračunata početna stopa imaju različito podrijetlo pa su zadržane obje oznake. Stupci, jedinice, legenda, preskok na usporedbu i PDF već su pokriveni testovima. Ranije korisnički uklonjene opcije dijeljenja nisu ponovno dodane; postojeći URL scenarija i ponovno provjeravanje izvora ostaju podržani. |
| I — pristupačnost i responzivnost | **VEĆ RIJEŠENO**, uz ciljanu korekciju C/H | Provjeren svih pet stranica na četiri širine: axe WCAG A/AA, page errors, API HTTP pogreške i prelijevanje. Postojeći testovi dodatno provjeravaju tipkovnicu, fokus, autocomplete, kviz, grafove i ispis. Nije proveden potpuni ručni audit čitačem zaslona; automatizirana provjera nije potvrda potpune usklađenosti. |

## B. Izmijenjene datoteke u ovom zadatku

Ovo je usporedba s kontrolnom točkom, **ne** cjelokupni `git diff` koji sadrži i raniji korisnički rad.

| Datoteke | Promjena / rizik |
|---|---|
| `backend/app/main.py`, `frontend/src/placeSearch.ts` | Pretraga kvačica i transliteracija; mali rizik šireg skupa rezultata, bez automatskog spajanja identiteta. Provjereni službeni nazivi i ID-jevi. |
| `frontend/src/components/RecyclingMap.tsx`, novi `frontend/src/mapLocationDetails.ts` | Neovisna polja popupova, kontakti i navigacija, zaštita URL-a i prikaza vremena; izvorne lokacije nisu mijenjane. Rasporedi i kontakti mogu biti zastarjeli u samom izvoru. |
| `frontend/src/compare/CompareCharts.tsx`, `frontend/src/styles.css` | Čitljiva godina i mobilna tablica; CSS promjene ograničene na Compare i aktivno stanje Simulatora. |
| `backend/app/comparison.py`, `frontend/src/compare/Compare.tsx` | Prioritet prikazanih opisnih uvida i objašnjenje algoritma; može se promijeniti odabrana trojka uvida, nikakva vrijednost metrika niti vršnjaci. |
| `frontend/src/simulator/Simulator.tsx` | Isključivo prikazno zaokruživanje glavne početne kartice. |
| `tests/test_postgres.py`, `tests/test_compare.py` | Regresije pretrage, identiteta, prioriteta i fallbacka uvida. |
| `frontend/tests/place-search.test.ts`, `frontend/tests/map-details.test.ts` (novo) | Lokalna normalizacija i zaštite prikaza mapa. |
| `frontend/e2e/recycling.spec.ts` | Očekivanja za namjerno prošireni popup; postojeće provjere filtera i klastera zadržane. |
| `frontend/e2e/review.spec.ts` (novo) | 13 regresijskih i audit browser testova, uključujući numeričke reference i cijeli proizvod na četiri širine. |
| `docs/external_review_verification.md` (novo) | Ovaj izvještaj. |

Dva dotaknuta backend modula usklađena su i s Ruff formatom. Četiri nepovezane ranije neformatirane datoteke nisu mijenjane, uključujući `pipeline/smoke_api.py`.

## C. Testiranje

Završna procedura ponovno je izvršena nakon svih izmjena koda; pojedinačne provjere tijekom razvoja nisu zamjena za ove rezultate.

| Provjera | Prije izmjena | Poslije izmjena |
|---|---:|---:|
| Backend / PostgreSQL | 80 prošlo, 0 palo | 82 prošlo, 0 palo |
| Frontend unit | 11 prošlo, 0 palo | 13 prošlo, 0 palo |
| Lokalni browser paket | 63 prošlo, 0 palo | 76 prošlo, 0 palo |
| Zasebni produkcijski browser test | 1 prošao, 0 palo | 1 prošao, 0 palo |
| TypeScript i produkcijski build | Prošlo | Prošlo |
| Frontend Prettier | Prošlo | Prošlo |
| Ruff lint | Prošlo | Prošlo |
| Ruff format cijelog projekta | 6 ranije neformatiranih datoteka | 4 ranije neformatirane datoteke; 35 prolazi |

Frontend nema konfiguriran zaseban ESLint/lint script; nije izmišljena tvrdnja da je takva provjera prošla. Izvršeni su TypeScript i Prettier. Vite upozorenje na Home chunk veći od 500 kB i Starlette/AnyIO deprecation warning postoje od početka i nisu greške izvršavanja.

Numerički regresijski test koristi stvarni API i razvojni skup:

- Zagreb 2024.: T 252.771,59 t; M 139.674,40 t; P 772.122; ukupno 327,37 i miješano 180,90 kg/obuhvaćenom stanovniku; službena stopa 44,74 %.
- Split 2024.: T 68.991,40 t; M 51.808,25 t; P 158.943; ukupno 434,06 kg/obuhvaćenom stanovniku; službena stopa 24,91 %.
- 2019.: izvedeni udjeli Zagreb 22,26 %, Split 15,28 %, Split − Zagreb −6,98 pb.
- Preusmjeravanje 10 % Zagreba: Δ 13.967,44 t; T 252.771,59 t; M′ 125.706,96 t; stopa 50,27 %.
- Prevencija 10 % Zagreba: T′ 238.804,15 t; M′ 125.706,96 t; stopa 47,36 %.

Reference se nalaze samo u testovima. Dodatno su testirani nedostajući materijali, proširenje raspona vršnjaka, različite godine, prekidi API-ja, povratni tokovi, PDF, sve funkcije Guidea te klasteri i filtri karte.

Snimke prije/poslije nalaze se u kontrolnoj točki `before/` i `after/`: Compare 1440/768/390/320, Hvar popup, uvidi Zagreb/Split te kartice i kontrole Simulatora. Snimke su vizualno pregledane; desktop je ostao isti, a mobilna godina sada je čitljiva bez prelijevanja. Dodatne završne snimke svih modula sačuvane su u `final-browser/` unutar kontrolne točke; produkcijski test može ponovno očistiti generirani `frontend/test-results/`.

## D. Povrat i odbačene varijante

- Prvi pokušaj CSS popravka godine zadržao je naslijeđenu širinu kontejnera od 120 px i uzrokovao prelijevanje na 390 px. Nije zadržan kao konačno rješenje: kontejner sada ima prirodnu širinu; cijeli odgovarajući regresijski paket ponovno je prošao.
- Prvi stil aktivnog gumba mogao je izgubiti naglasak na hoveru; dorađen je i testiran. Izmjene koje uvode regresiju nisu prihvaćene kao završno stanje.
- Nisu implementirane spekulativne promjene podataka, složeni Explorer stupci, novi materijalni endpoint, novi način dijeljenja ni redizajn.
- `baseline.tar.gz` čuva i raniji necommitani rad; sam povrat na početni Git commit **ne bi** sačuvao taj rad. Zato ne koristiti globalni Git restore/reset.
- Kontrolna točka sadrži `rollback.py` i manifest završnih kontrolnih zbrojeva. Alat prvo provjerava da se datoteke nisu naknadno promijenile; zadano radi samo pregled. Podržava pojedinačne skupine A/B/C/E/H i zasebnu skupinu T za nove objedinjene browser testove. Koristiti iz korijena projekta: `python3 /tmp/wastewise-review-20261107-183620/rollback.py C` za pregled; tek dodavanje `--apply` izvršava odabrani povrat. Za povrat svih ovih dorada: skupina `all`. Nakon povrata potrebno je ponovno izgraditi lokalni frontend/backend.
- Povrat je dodatno izvršen i provjeren na izdvojenim privremenim kopijama: sve skupine zajedno, C prije H i H prije C. Usporedba s arhivom potvrđuje identičan povrat bajtova; stvarni projekt nije vraćan.
- Kontrolna točka je lokalna u `/tmp`, nije Git commit niti javni backup; treba je sačuvati izvan privremenog direktorija ako se želi dugoročna kopija.

## E. Preostala ograničenja

- Aktualnost kontakata/radnog vremena, bliske moguće duplikate i klasifikaciju lokacija treba provjeravati s izdavačima ili na terenu. Karta nije potpuni nacionalni registar; prihvat pojedinih materijala nije pretpostavljen.
- Kontinuitet materijalnih nazivnika i međugodišnjih obuhvata nije potvrđen. Nisu uvedeni zaključci o poboljšanju sustava ili recikliranju.
- Četiri zatečena odstupanja od Ruff formata ostaju evidentirana: `backend/app/config.py`, `backend/app/production.py`, `pipeline/smoke_api.py`, `tests/test_deployment.py`. Smanjenje Home paketa traži zasebnu optimizaciju učitavanja.
- Provjere su lokalne, u Chromiumu. Stvarni Safari/iOS i potpuni ručni audit čitačem zaslona: **NIJE PROVJERENO**. Javno objavljena aplikacija nije ažurirana niti provjeravana kao da sadrži ove lokalne izmjene.

Završna kontrola sadržaja usporedila je svih 216 datoteka iz arhive: 11 zatečenih datoteka namjerno je izmijenjeno ovim zadatkom; preostalih 205 ostalo je identično, uključujući izvorne podatke, ETL, matematičke modele, manifeste i raniji Guide. Dodano je pet novih datoteka ovog zadatka.
