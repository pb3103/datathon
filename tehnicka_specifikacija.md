Primarni tok: korisnik traži Bjelovar → pregledava dostupne godine → otvara usporedive JLS → odabire rezultat vršnjaka kao scenarijski cilj → vidi promjenu mase u simulatoru. Odabir JLS i godine prenosi se između modula; rezultat mora ostati reproducibilan iz URL-a i parametara. Cilj vršnjaka označen je kao scenarij, bez tvrdnje da je ostvariv ili zakonski obvezan.

UI: navigacija Explorer / Compare / Simulator; bijela ili svijetla podloga, zelena kao naglasak, jasan kontrast. Format brojeva hr-HR, jedinice uz vrijednosti. Svaki graf ima tablični prikaz, tipkovničku navigaciju i opis; boja nije jedini nositelj informacije. Na mobitelu kartice idu u jedan stupac. Nedostajuće vrijednosti prikazuju se kao „Nema podatka”, s razlogom kada je poznat. Učitavanje, prazan rezultat i pogreška imaju zasebna stanja.

## 4. Podatkovni model i kvaliteta

Predložena arhitektura: Python 3.12, pandas/openpyxl za ETL; FastAPI + Pydantic + SQLAlchemy/Alembic; PostgreSQL 16; React + TypeScript + Vite i Recharts. Verzije ovisnosti zaključati pri implementaciji, nakon provjere kompatibilnosti. REST JSON i OpenAPI služe kao ugovor frontenda i backenda. Preglednik razgovara samo s API-jem; izvorne datoteke obrađuju se izvan korisničkog zahtjeva.

| Entitet | Ključna polja i ograničenja |
|---|---|
| `municipality` | interni ID, službena šifra i sustav šifre, naziv, županija, tip grad/općina; šifra jedinstvena u važećoj verziji |
| `municipality_alias` | naziv izvora, županija, izvor, potvrđeni ID; audit ručnih povezivanja |
| `source_dataset` | izdavač, naslov, katalog URL, resurs URL, licenca, datum preuzimanja, SHA-256, godina, list, verzija metodologije |
| `import_run` | izvor, verzija parsera, početak/kraj, broj prihvaćenih i odbijenih redaka, status, izvještaj |
| `waste_observation` | JLS, godina, izvorni redak, ukupno t, miješano t, obuhvaćeni stanovnici, objavljeni kg/stan., objavljena stopa odvajanja, metodološka skupina, status kvalitete |
| `material_observation` | JLS, godina, materijal, objavljeno kg/stan., izvor/list/redak, status provjere nazivnika, dokaz PDF kontrole i aktivna revizija; bez pretvorbe u tone |
| `population_observation` | JLS, referentna godina/datum, broj stanovnika, popis/procjena, izvor |
| `quality_issue` | zapis/import, kod problema, ozbiljnost, opis; bez tihog brisanja spornih redaka |

Za objavljeni skup postoji jedan aktivni zapis po JLS/godini/obuhvatu; revizije ostaju povezane s izvorom. Mase i stope pohranjuju se kao NUMERIC, stanovništvo kao cijeli broj; NULL znači nedostajuće. Nula ostaje valjana samo kada je tako prijavljena. Izvorna vrijednost čuva se radi audita.

ETL postupak:
1. Spremiti izvornu datoteku bez izmjena i manifest s atribucijom, licencom i checksumom.
2. Pregledati listove, višeredna zaglavlja, fusnote, jedinice i ukupne retke. Izraditi eksplicitno mapiranje stupaca za svaku godinu.
3. Parsirati hrvatske decimalne i tisućične oznake; razlikovati praznine, crtice, nule i tekstualne napomene.
4. Povezivati prvo po službenoj šifri. Ako je nema, koristiti pregledanu tablicu naziv + županija. Fuzzy podudaranje daje prijedlog za ručni pregled, nikad automatski prihvat.
5. Provjeriti duplikate, negativne mase, stope izvan 0–100, nevaljano stanovništvo i miješano > ukupno. Sporne retke staviti u karantenu; razlike zbog zaokruživanja dokumentirati.
6. Usporediti objavljene i izvedene pokazatelje. Početne tolerancije određuju se prema preciznosti izvora, ne proizvoljno velikim pragom.
7. Sastaviti matricu usporedivosti godina. Promjena obuhvata ili granica JLS prekida trend dok ne postoji dokumentirano usklađenje.
8. U transakciji učitati pregledani skup; ponovni uvoz istog checksuma ne smije duplicirati zapise. Generirati izvještaj po godini.

Audit navodi stvarni broj JLS, razloge izostanaka, neuspjela povezivanja, praznine, raspon vrijednosti i provjerljive službene agregate. Zbrojevi i prosjeci rade se samo za isti obuhvat. Nacionalna stopa ne računa se običnim prosjekom lokalnih postotaka. Pokazatelji po obuhvaćenom stanovniku ne koriste ukupnu DZS populaciju kao zamjenu bez promjene naziva pokazatelja.

## 5. Explorer i definicije pokazatelja

Neka je T ukupno sakupljeno u tonama, M miješano u tonama, P broj stanovnika obuhvaćenih uslugom i G objavljena stopa odvojenog sakupljanja u postocima.

- Ukupno kg po obuhvaćenom stanovniku: 1000T/P, samo za P > 0.
- Miješano kg po obuhvaćenom stanovniku: 1000M/P, samo za P > 0.
- Udio miješanog: 100M/T, samo za T > 0 i isti obuhvat.
- Razlika tokova: T − M. Dok se ne provjeri metodologija, naziv je „razlika ukupnog i miješanog”, a ne automatski „odvojeno sakupljeno”.
- Godišnja relativna promjena: 100(x_y − x_preth)/x_preth, samo za prethodnu vrijednost > 0 i uzastopne usporedive godine.
- Promjena stope: G_y − G_preth, u postotnim bodovima.

Stopa odvojenog sakupljanja prikazuje se iz službenog izvora. Izvedena stopa 100(T−M)/T služi za kontrolu; nije zamjena dok definicija nije potvrđena. Nije dopušten naziv „recikliranje” za G. Grafovi sadrže godinu, obuhvat, jedinicu i izvor. Nepovezane godine ne spajaju se linijom preko metodološkog prekida.

## 6. Waste Compare — objašnjiv odabir vršnjaka

Odabir vršnjaka i usporedba njihova učinka odvojeni su koraci. Stopa odvajanja, količina otpada i drugi rezultati koje želimo uspoređivati NE koriste se kao ulaz u sličnost: to bi unaprijed favoriziralo slične rezultate.

Kandidati: druga JLS, ista godina i usporediv obuhvat/metodologija, valjani usporedbeni podaci. Ako usporedivih nema, sustav to kaže. Ne prelazi na drugu godinu bez vidljive oznake i izričitog korisničkog odabira.

Aktualni algoritam `covered-population-v2` (dorada 30. listopada 2026.):
- obuhvaćena populacija je jedini kriterij udaljenosti; nije ukupno stanovništvo;
- županija je opcijski filtar „ista županija” / „cijela Hrvatska”, bez težine u bodovanju;
- prednost imaju kandidati s omjerom P_kandidat/P_početna u uključivom rasponu 0,5–2;
- ako ih nema dovoljno, dodaju se najbliži izvan raspona uz isto filtriranje županije i jasno upozorenje; vraća se manje od pet ako nema prihvatljivih kandidata;
- D = abs(ln(P_kandidat) − ln(P_početna)), Decimal račun s preciznošću 32 i udaljenošću na 24 decimale. Izjednačenja se razrješavaju stabilnim internim UUID-om dok službene šifre nedostaju;
- isključuju se sama početna JLS, druga godina, neusklađen obuhvat/metodološka skupina, nevaljana ili sporna populacija i zapisi bez pokazatelja za usporedbu. Prijedlozi su potencijalni vršnjaci, ne potvrda usporedivosti, vjerojatnost ili preporuka;
- sustav predlaže do pet kandidata; odabrana usporedna skupina ima 2–5 JLS ukupno, uključujući početnu.

Mogući budući algoritam nakon dodatne provjere uključuje službeni tip JLS i ukupno stanovništvo tek kad su pribavljeni: težine i obilježja treba zasebno potvrditi; nisu dio aktualnog algoritma. Ne miješati verzije ili nedostajuća obilježja među kandidatima: cijeli izračun koristi zajedničku dostupnu konfiguraciju, uz objavu verzije. Turistička noćenja i gustoća mogu biti kasnija obilježja nakon provjere izvora i godina.

Rezultat usporedbe: poredak sličnosti, zasebni poredak po odabranoj dostupnoj metrici unutar prikazane skupine, godišnji trendovi gdje su dopušteni i razlika od odabrane JLS. Medijan stope vršnjaka opisuje tu skupinu, nije nacionalna stopa. Viša stopa odvajanja ne znači automatski bolju ukupnu uslugu. Materijalni ETL obuhvaća sedam objavljenih kategorija u kg/stan. Jedinice i nazivnici kontroliraju se po retku prema PDF masama. Usporedbe koriste samo provjerljive nazivnike i valjanu populaciju iste godine i obuhvata; potpuno nulti retci ne potvrđuju nazivnik. Kontinuitet obuhvata među godinama nije potvrđen, pa nema povezivanja ili godišnjih materijalnih promjena. Kategorije se ne zbrajaju niti pretvaraju u tone.

## 7. Waste Simulator — matematički ugovor

Simulator je deterministički what-if izračun, bez tvrdnji o uzročnosti, vremenu ostvarivanja, troškovima ili recikliranju. Svi izračuni koriste punu preciznost, a zaokruživanje je samo prikazno.

### A. Preusmjeravanje dijela miješanog toka

Za 0 ≤ r ≤ 1: Δ = rM, M' = M−Δ, T' = T. Pretpostavka: sva preusmjerena masa ostaje u istom obuhvatu i prelazi u nemiješani tok, bez gubitaka i promjene nastajanja otpada. Ako je dokazano da S = T−M jest odvojeno sakupljeno, tada S' = S+Δ i G' = 100S'/T. Potvrda bilance postoji za pregledane izvore javne usluge 2023./2024.; ne proširuje se na 2021./2022. niti na usporedivost godina. Scenarijska stopa nije novi službeni podatak.

Automatski alternativni scenariji: preusmjeravanje 5 %, 10 % i 20 % početnog miješanog toka. To su ilustrativni parametri, a ne procjene učinka mjera.

### B. Ciljna stopa odvojenog sakupljanja

Dostupno samo kada su potvrđeni isti nazivnik i zatvorenost dvaju tokova: T = M+S i G = 100S/T unutar dokumentirane preciznosti. Za cilj g* u [0,1]: S* = g*T, Δ = S*−S, M* = M−Δ. Za scenarij poboljšanja dopušteni su g* ≥ S/T i Δ ≤ M. Niži cilj označiti kao već dosegnut, bez automatskog smanjivanja odvajanja. Cilj od 100 % dopušta M* = 0; negativne mase nisu dopuštene. Bez potvrđene metodologije ovaj način ostaje nedostupan uz objašnjenje.

Implementirani cilj može biti ručni ili objavljeni rezultat konkretne referentne JLS iz Comparea iste godine, uz ponovno provjeren izvor i podrijetlo. Medijan nije implementiran. Medijan se ne predstavlja kao pravna obveza. Ne koristiti EU ciljeve recikliranja kao lokalne ciljeve odvojenog sakupljanja.

### C. Prevencija nastajanja miješanog otpada

Za 0 ≤ r ≤ 1: Δ = rM, M' = M−Δ, T' = T−Δ, a S ostaje isto ako je definiran. Nova stopa je 100S/T' samo uz potvrđenu metodologiju i T' > 0. Razlikovati od preusmjeravanja: ovdje se ukupna masa smanjuje. Kada je T' = 0, stopa nije definirana. Za cilj g u postocima iznad početne stope vrijedi Δ = T − 100S/g, uz S > 0. Ako je S = 0, prevencija sama ne može ostvariti pozitivnu stopu.

Provjerljivi sintetski primjer, ne podatak stvarne JLS: T=1000 t, M=700 t, S=300 t. Preusmjeravanje 10 % miješanog daje Δ=70 t, M'=630 t, S'=370 t i 37 %. Cilj 50 % zahtijeva preusmjeriti 200 t, pa M*=500 t. Prevencija 10 % miješanog daje T'=930 t, M'=630 t, S'=300 t i približno 32,26 %.

Rubni slučajevi: nedostajući ulazi, nulta ukupna masa, P=0, M>T, parametri izvan raspona, nepotvrđen obuhvat i cilj već dosegnut. API vraća strukturiran razlog nedostupnosti, ne lažni rezultat 0.

## 8. API ugovor

Svi endpointi pod `/api/v1`; rezultati uključuju izvore, metodološku skupinu i oznake kvalitete. Identifikatori nisu nazivi. Paginacija za popise, parametrizirani SQL, kontrolirana veličina odgovora i CORS samo za konfigurirani frontend.

| Metoda i ruta | Svrha |
|---|---|
| `GET /municipalities?q=&county=&page=` | Pretraga i filtriranje |
| `GET /municipalities/{id}/years` | Stvarno dostupne godine i status usporedivosti |
| `GET /municipalities/{id}/observations?from_year=&to_year=` | Sirove/izvedene metrike s jedinicama i statusom |
| `GET /municipalities/{id}/peers?year=&limit=5&county_scope=all` | Konfiguracija algoritma, udaljenosti i usporedni pokazatelji |
| `GET /municipalities/{id}/simulation-context?year=` | Početno stanje, verzija modela, metodološki dokaz i razlozi dostupnosti |
| `POST /simulations` | JLS, godina, način, r ili cilj; odgovor polazno/scenarij/razlika i pretpostavke |
| `GET /comparisons?ids=&ids=&year=&baseline_id=` | Ručni odabir 2–5 JLS, vrijednosti, razlike, backend provjerene povijesne metrike, materijali i opisni uvidi |
| `GET /sources` | Izvori, licence i verzije |
| `GET /health/live` | Proces radi |
| `GET /health/ready` | Baza i potrebne migracije dostupne; status podataka prikazan zasebno |

HTTP 404 za nepostojeći JLS/zapis, 422 za nevaljan scenarij, 503 za nedostupnu infrastrukturu. Nedostajuća pojedinačna metrika vraća null i razlog, bez rušenja cijelog profila. API računa rezultate; frontend ih ne implementira zasebno.

## 9. Struktura implementacije i pokretanje

Planirani direktoriji: `backend/`, `frontend/`, `pipeline/`, `data/manifests/`, `docs/` i `tests/`. Izvorne velike datoteke izvan Gita ili u dokumentiranom ignoriranom direktoriju; provjeriti licencu prije redistribucije. Sintetski fixturei jasno odvojeni od službenog skupa.

PostgreSQL lokalno kao servis ili kontejner nakon provjere mogućnosti okruženja. Konfiguracija: DATABASE_URL, konfigurirani CORS origin i putanja podataka; razvojne lokalne vjerodajnice nisu produkcijske tajne. `.env.example` sadrži samo predloške. Nema poziva vanjskim LLM-ovima ni API ključeva potrebnih za MVP.

Buduće startup upute moraju koristiti postojeći checkout u izoliranom cloud zadatku; bez izrade Git worktreea osim na izričit zahtjev. Točne naredbe, zaključane ovisnosti i reusable cloud install/start konfiguracija spremaju se tek nakon stvarne implementacije i provjere. Ovaj dokument nije dokaz da aplikacija ili baza već rade.

## 10. Kriteriji prihvata i testiranje

- ETL: poznati fixturei za decimalne zapise, praznine, duplikate i alias nazive; nema tihog gubitka redaka; isti uvoz ne duplicira podatke. Audit svih dostupnih godina i izvora je isporučen.
- Explorer: pretraga vodi na ispravan JLS; pokazatelji odgovaraju verificiranom retku izvora; godine bez podataka nisu izmišljene; trend poštuje usporedivost i prikazuje izvor.
- Compare: nema same odabrane JLS, sortiranje je determinističko, uspoređuje istu godinu, jasno prikazuje manje od pet kandidata; ručno pregledani primjeri različitih veličina i provjera osjetljivosti težina.
- Simulator: testovi gornjeg sintetskog primjera i rubnih slučajeva; očuvanje mase kod preusmjeravanja, smanjenje ukupne mase kod prevencije; nemoguć cilj odbijen; metodološki nedostupna stopa ne prikazuje se.
- Backend: integracijski testovi na PostgreSQL-u s migracijama; nema zamjene baze SQLiteom kao jedine provjere. Frontend: TypeScript provjera i produkcijski build.
- End-to-end: stvarni API + baza + frontend, pretraga JLS → profil → vršnjaci → simulator. Provjeriti mobilni prikaz, tipkovnicu, prazan skup i prekid API veze.
- Podaci: prije javnog dema provjeriti reprezentativne retke prema izvornim datotekama. Sintetski demo može validirati softver, ali ne zamjenjuje demonstraciju sa stvarnim otvorenim podacima.

## 11. Plan do predaje

| Razdoblje 2026. | Isporuka |
|---|---|
| 29.–30. listopada | Potvrda opsega, provjera prijave, pribavljanje izvora i data audit |
| 31. listopada – 2. studenoga | ETL, baza, migracije, API i provjeren prvi profil JLS |
| 3.–4. studenoga | Explorer i Compare s obrazloženjem vršnjaka |
| 5.–6. studenoga | Simulator i povezan korisnički tok |

## 12. Implementirani Simulator — potvrda bilance i revizije

Model `public-service-mass-balance-v1` koristi S=T−M i stopu 100S/T samo za isti obuhvat javne usluge 2023./2024. Potvrda: izvješće 2024., str. 20 i 37, Tablica 11, te korisnikov pregled izvješća za 2023./2024.; manifest `data/manifests/simulator_methodology.json` ograničava dopuštene revizije. Ne mijenja se opća oznaka međugodišnje usporedivosti. Promjena prijavljivanja recikliranih količina nije dio ovog modela.

API ponovno provjerava objavljenu stopu intervalom zaokruživanja masa i stope iz ETL konfiguracije; neusklađeni zapisi isključeni su iz automatskog izračuna. Za 2023./2024. mase imaju interval ±0,005 t, a objavljena stopa ±0,005 postotnih bodova. To je eksplicitna pretpostavka kontrole preciznosti, bez tvrdnje da je neovisno potvrđeno izdavačevo pravilo zaokruživanja. Objavljena i modelska početna stopa ostaju odvojene.

POST prihvaća 1–4 neovisna scenarija s modelom `diversion`/`prevention`, unosom `fraction`/`tonnes`/`target`, ID-jem početnog zapisa i checksumom. Referenca je vezana uz pojedini scenarij. Promijenjene revizije vraćaju 409; metodološki i matematički nevaljani scenariji 422. Nema zapisivanja rezultata u bazu. Lokalno spremanje, URL i JSON čuvaju parametre i verzije; učitavanje ponovno provjerava podatke i računa rezultate.


## 13. Povezani korisnički proizvod

Početna stranica `/` objašnjava vrijednost WasteWisea i vodi pretragom u `/explorer`; ostali moduli su `/compare` i `/simulator`. Stare profilne poveznice s korijenske rute ostaju podržane. Promjene su ograničene na prezentaciju, navigaciju i lokalno korisničko stanje: formule, ETL, izvori, metodološki manifesti i backend pravila kvalitete ostaju nepromijenjeni.

Zajednički kontekst je JLS, godina i usporedna skupina do pet JLS-ova. Referentni scenarijski URL vrijedi samo unutar provjerenog Simulatora; promjena početnog odabira čisti stare reference. Valjani radni nacrt vezan uz zapis, checksum i model može se obnoviti u istoj kartici preglednika, uz obvezan ponovni izračun na API-ju. Nespremljene izmjene jasno su označene. Za nepodržani model kontrole su onemogućene uz objašnjenje i mogućnost odabira druge dostupne godine.

Početni primjer Bjelovar–Samobor 2024. razlikuje objavljene vrijednosti od hipotetskih scenarija iz postojećeg API-ja. PDF/ispis sadrži sažetu brojčanu tablicu, parametre, pretpostavke i trag izvora; ne ispisuje kontrole aplikacije. Upozorenja koja utječu na rezultat i upozorenje o 2023. ostaju dostupna i vidljiva.


## Proširenje povijesnog obuhvata 2017.–2024.

Explorer i Compare koriste osam godina i isti kanonski registar 556 JLS. Povijesni CSV/PDF uvoz je zaseban adapter postojećeg transakcijskog ETL-a; model baze nije proširen migracijom. Izvorni CSV, PDF stranica, SHA-256, pregledani aliasi i korekcije iz PDF-a ostaju dostupni u tragu izvora. Povijesni obuhvat nije automatski proglašen javnom uslugom novijih godina.

Službena stopa 2017.–2020. ostaje nedostupna. Kontrolni omjer masa zasebna je metrika s metodološkim upozorenjem i ne sudjeluje u razlikama službenih stopa, uvidima ni Simulatoru. Sedam materijala ostaje ograničeno na uvezene izvore 2021.–2024., a modeli Simulatora isključivo na provjerene 2023./2024. Bez potvrđenog kontinuiteta godine se ne povezuju linijom niti tumače kao dokaz poboljšanja. Potpuna evidencija: `docs/historical_integration_verification.md` i pripadajući JSON auditi.
