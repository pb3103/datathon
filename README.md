# WasteWise

WasteWise s početnom stranicom i tri povezana modula u Reactu + TypeScriptu, povezan s FastAPI-jem i PostgreSQL-om. ETL učitava godišnje pokazatelje za 2017.–2024. iz stvarnih lokalnih CSV/PDF i XLSX izvora. Waste Compare je funkcionalan alat za ručni odabir 2–5 JLS-ova, prijedloge vršnjaka i usporedbu pokazatelja. Waste Simulator omogućuje preusmjeravanje i prevenciju, ciljnu stopu te usporedbu do četiri scenarija nad provjerenim podacima javne usluge za 2023. i 2024.

## Pokretanje

Potreban je pokrenut Docker Desktop s Docker Composeom i postojeće četiri XLSX datoteke pod `podaci/<godina>/`, prema `data/manifests/source_files.json`. Izvori nisu uključeni u Docker image. U postojećem checkoutu već su praćeni Gitom; to nije mijenjano. `.gitignore` sprječava dodavanje novih sirovih datoteka, ali ne uklanja prethodno praćene izvore. Provjerene verzije: Python 3.12.11, PostgreSQL 16.9; sve Python ovisnosti zaključane su u `backend/requirements.lock.txt`.

Iz korijena ovog checkouta:

```sh
docker compose build api
docker compose up -d db
docker compose run --rm api alembic -c backend/alembic.ini upgrade head
docker compose run --rm api python -m pipeline.import_data --dry-run
docker compose run --rm api python -m pipeline.import_data
docker compose run --rm api python -m pipeline.historical --dry-run
docker compose run --rm api python -m pipeline.historical
docker compose run --rm api python -m pipeline.materials
docker compose up -d api
```

API: http://localhost:8000/docs. Baza je lokalno dostupna na `localhost:5433`; API na `localhost:8000`. Izvori su montirani samo za čitanje. Compose lokalne postavke ne traže `.env`; `.env.example` daje predložak za drukčiju konfiguraciju. CORS dopušta samo konfigurirani origin `http://localhost:5173`.

Uvoz je po izvoru transakcijski; ponavljanje istog checksuma preskače već dovršeni uvoz. Promijenjena datoteka prvo zahtijeva pregled i ažuriran manifest; aktivna revizija ne zamjenjuje se bez `--activate-revision`. Ta opcija čuva prethodna opažanja kao neaktivna i odbija reviziju koja bez zasebnog usklađenja mijenja skup JLS. Promjena parsera za već uvezeni checksum zahtijeva zasebnu migraciju podataka; nije automatski ponovni uvoz.

Staging JSON i izvještaji standardno se pišu u direktorij jednokratnog kontejnera. Za trajni lokalni pregled koristite:

```sh
mkdir -p data/staging
docker compose run --rm -v ./data/staging:/workspace/data/staging api python -m pipeline.import_data --dry-run
```

Zaustavljanje bez brisanja baze:

```sh
docker compose stop
```

## Frontend — WasteWise

Ako su migracija i podaci iz prethodnog odjeljka već učitani:

```sh
docker compose build frontend
docker compose up -d frontend
```

Otvorite **http://localhost:5173** (početna stranica). Explorer je na `/explorer`, Compare na `/compare`, a Simulator na `/simulator`. Upišite `Bjelovar`, pritisnite Enter ili „Pretraži”, otvorite rezultat i promijenite godinu. Upute koriste postojeći checkout; ne izrađuju dodatni worktree. Frontend servis automatski pokreće API i bazu, ali ne izvršava migracije ni uvoz.

React 18, TypeScript, Vite i Recharts koriste zaključane verzije u `frontend/package-lock.json`. Lokalni Docker image koristi Node 22.16.0; nije potrebno instalirati Node na računalo. Izmjene u `frontend/` vide se kroz Vite hot reload. Nakon promjene ovisnosti ponovno izgradite image i osvježite volumen ovisnosti naredbom `docker compose run --rm --no-deps frontend npm ci`, zatim ponovno pokrenite frontend.

Preglednik šalje zahtjeve na `/api/v1` na istom originu; Vite proxy ih prosljeđuje servisu `http://api:8000`. Nema ugrađenih podataka, kopiranja API izračuna u frontend ni izravnog pristupa bazi ili XLSX datotekama. `API_PROXY_TARGET` je adresa koju dohvaća razvojni/preview poslužitelj. Opcionalni `VITE_API_BASE_URL` mijenja adresu API-ja u klijentu pri buildu; za izravan poziv drugog origina treba odgovarajuća CORS konfiguracija backenda.

Odabrani JLS i godina nalaze se u URL-u kao `?jls=<interni-uuid>&godina=2023`. Poveznica reproducira profil, a natrag/naprijed vraća prethodni odabir. Ako tražena godina nije dostupna, sučelje to kaže i traži odabir dostupne godine, bez tihog prelaska na drugu.

Kartice i godišnji prikazi koriste isključivo API vrijednosti. Pretvorba decimalnog stringa u broj služi formatiranju `hr-HR` i crtanju grafa; pokazatelji, postoci i godišnje promjene ne izračunavaju se ponovno. Objavljeni i izračunati kg/obuhvaćenom stanovniku imaju zasebne oznake. Za sporni nazivnik izračun ostaje „Nema podatka”, uz razlog, a objavljena vrijednost ostaje vidljiva.

Za `provisional` ili nepoznatu usporedivost godišnje vrijednosti ostaju odvojene. Linija je dopuštena tek za uzastopne godine iz istog obuhvata i metodološke skupine, kada API potvrđuje usporedivost i kontinuitet. Trenutačni skup stoga prikazuje odvojene stupce, bez tvrdnje o potvrđenom kontinuiranom trendu. Upozorenja za izvore 2023. i 2024. vidljiva su za cijeli godišnji pregled neovisno o odabranoj godini.

Svaki graf ima alternativnu tablicu, opis, jedinicu, obuhvat i izvor. Tablica prikazuje i razloge nedostajućih vrijednosti. Podaci o datoteci, listu, retku, licenci, metodologiji i SHA-256 dostupni su u „Izvori”; nepotvrđeni URL-ovi nisu predstavljeni kao poveznice za preuzimanje. Stopa odvojenog sakupljanja nije nazvana recikliranjem.

### Provjere frontenda

```sh
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm test
docker compose run --rm --no-deps frontend npm run build
docker compose run --rm --no-deps frontend npm run format:check
```

Produkcijski statički rezultat nalazi se u `frontend/dist/` nakon builda. Za lokalni pregled tog builda prebacite frontend servis na preview naredbu, s istim API proxyjem i portom 5173:

```sh
docker compose -f compose.yaml -f compose.preview.yaml up -d frontend
```

Povratak na razvojni Vite poslužitelj s hot reloadom:

```sh
docker compose up -d frontend
```

Vite preview služi lokalnoj provjeri builda; javni hosting nije konfiguriran ni objavljen. Budući produkcijski poslužitelj treba posluživati statički `dist/`, SPA fallback i prosljeđivanje `/api` prema FastAPI-ju, ili eksplicitni API origin uz CORS.

### Browser testovi sa stvarnim API-jem

Uz učitane podatke i pokrenut frontend:

```sh
docker compose build frontend-e2e
docker compose up -d frontend
docker compose run --rm --no-deps frontend-e2e
```

Testovi koriste Chromium iz zaključanog Playwright Docker imagea. Osnovni tok pretraga → Bjelovar → promjena godine, Segetov nesklad, nulta stopa, prazan rezultat i obnova odabira rade sa stvarnim FastAPI-jem i PostgreSQL-om. Posebno označeni testovi namjerno zadržavaju ili prekidaju mrežni zahtjev radi provjere učitavanja, pogreške i ponovnog pokušaja. Pristupačnost se dodatno provjerava axe alatom, uz tipkovnički i mobilni tok. Izvještaji, snimke i tragovi pada testova nalaze se u ignoriranom `frontend/test-results/`.

### Obnova OpenAPI tipova

`frontend/openapi.json` je snimka stvarnog `/openapi.json`, a `src/api/schema.d.ts` generiran je iz nje. Nakon promjene API ugovora obnovite oba pa ponovite TypeScript provjeru:

```sh
docker compose exec -T api python -c 'import urllib.request; print(urllib.request.urlopen("http://localhost:8000/openapi.json").read().decode())' > frontend/openapi.json
docker compose run --rm --no-deps frontend npm run api:types
docker compose run --rm --no-deps frontend npm run typecheck
```

## Waste Compare

Otvorite **http://localhost:5173/compare**, ili prijeđite iz Explorera uz zadržanu početnu JLS i godinu. Pronađite početnu zajednicu te pretragom ili karticama prijedloga dodajte do četiri druge. Ukupan odabir je 2–5 JLS-ova. Početnu JLS možete promijeniti unutar skupine; razlike se računaju kao druga JLS minus početna.

Algoritam `covered-population-v2` koristi samo obuhvaćenu populaciju: `|ln(P kandidata) − ln(P početne JLS)|`, uz decimalnu udaljenost na 24 decimale i stabilni UUID za izjednačenja. Prvo vraća kandidate s omjerom 0,5–2, zatim najbliže izvan raspona samo ako nedostaje kandidata. Proširenje je označeno na kartici i upozorenjem. Županija je opcijski filtar, bez bodovne težine; filtar ne mijenja ručno odabranu skupinu. Ishodi otpada ne ulaze u sličnost. Nevaljana ili sporna populacija isključuje automatski prijedlog, ali dopušta ručni pregled drugih valjanih metrika.

Compare prikazuje:

- kartice prijedloga s populacijom, omjerom i udaljenošću;
- usporedni graf i tablicu masa, količina po obuhvaćenom stanovniku, objavljene stope odvojenog sakupljanja i sedam materijala;
- razlike u t, kg/stanovniku ili postotnim bodovima, s izvorima i razlozima nedostupnosti;
- godišnje prikaze bez povezivanja nepotvrđenih godina;
- odvojene objavljene i izračunate vrijednosti, uz postojeća upozorenja za 2023./2024.;
- sekciju „Gdje su najveće razlike?” s konkretnim JLS-ovima, vrijednostima, jedinicom i godinom.

Uvidi su deterministički opis: raspon podijeljen najvećom apsolutnom vrijednošću, do tri najveća relativna raspona, najviše jedan po skupini metrika. Nedostajuće i sporne vrijednosti izostavljaju se, a prikazuje se koliko je odabranih JLS-ova obuhvaćeno uvidom. Objavljeni ukupni kg/stan. ne ulaze dodatno u uvide kako se isti pokazatelj ne bi dvaput brojao. Nema LLM-a, tvrdnje o statističkoj značajnosti, uzročnosti ili preporuke mjera.

URL čuva `jls`, ostale ID-jeve u `usporedi`, `godina`, `zupanija`, `metrika`, `prikaz` i `razdoblje`. Promjena godine zadržava skupinu i prikaz graf/tablica. Prijedlozi se ponovno računaju za istu novu godinu, bez automatske zamjene ručno odabranih JLS-ova.

„Simuliraj ovaj cilj” otvara `/simulator` s početnom i referentnom JLS, godinom, stopom, ID-jevima opažanja i SHA-256 izvora. Simulator ponovno provjerava izvor, aktivnu reviziju, metriku, obuhvat i cilj na API-ju. Cilj nije tvrdnja o ostvarivosti ni pravna obveza. Za 2017.–2022. automatski izračun ostaje nedostupan.

### Materijalni ETL i metodologija

```sh
docker compose run --rm api python -m pipeline.materials --dry-run
docker compose run --rm api python -m pipeline.materials
```

Migracija `0002` dodaje `material_observation`. Uvoze se papir, plastika, staklo, metal, glomazni otpad, tekstil i biootpad: ukupno 15.568 opažanja za 556 JLS × 4 godine × 7 kategorija. Uvoz je transakcijski po izvoru, čuva izvorne XML ćelije, karantenu i povijest; ponavljanje istog izvora ne duplicira podatke. Nova revizija traži pregled i `--activate-revision`, a nepotpuna zamjena aktivne skupine se odbija.

XLSX materijalne vrijednosti objavljene su u **kg/stan.**, PDF materijalne tablice u **tonama**. Read-only kontrola svih redaka usporedila je objavljene kg/stan. uz prijavljeni P s objavljenom PDF masom. To je provjera jedinice i nazivnika, ne izvoz novih masa u tone. Evidencija sa SHA-256 oba izvora, PDF stranicom, retkom i statusom kategorije nalazi se u `data/manifests/material_verification.json`.

Aritmetička kontrola usklađena je za svih 15.568 vrijednosti. Za 819 vrijednosti iz potpuno nultih redaka nazivnik se ipak ne može potvrditi, pa ostaju `zero_only_denominator_unverified`. Njihove objavljene nule ostaju vidljive u izvorima, ali ne ulaze u materijalne razlike ili uvide. Dodatno se isključuju materijalni pokazatelji zapisa sa spornom populacijom, izmijenjenom verzijom glavnog izvora ili neusklađenim obuhvatom.

Obuhvat materijala 2021.–2022. uključuje javnu uslugu i spremnike na javnim površinama; naslovi 2023.–2024. navode javnu uslugu. Kontinuitet obuhvata i nazivnika među godinama nije potvrđen. Zato se godine prikazuju zasebno, bez materijalnih godišnjih promjena, linije preko prekida, zbrajanja kategorija ili pretvaranja u tone. Aritmetička kontrola ne znači da je prijavljena populacija točna niti da su kategorije iscrpna razgradnja ukupnog odvojenog toka.

Za obnovu kontrole na macOS-u s PDFKit-om:

```sh
mkdir -p /tmp/wastewise-audit
swift pipeline/pdf_material_words.swift podaci/*/*.pdf
docker compose run --rm -v /tmp/wastewise-audit:/audit:ro -v ./data/manifests:/workspace/data/manifests api python -m pipeline.verify_materials --words-dir /audit
```

Parser auditnih PDF riječi vezan je uz postojeće pregledane verzije i raspone stranica; nova verzija zahtijeva pregled mapiranja. Nejasno parsiran redak ostaje nepotvrđen, bez fuzzy prihvaćanja. Aplikacija ne obrađuje PDF tijekom korisničkog zahtjeva. Izvorne datoteke se ne mijenjaju.

## Trenutačni API

Sve rute pod `/api/v1`:

- `GET /municipalities?q=Bjelovar&county=&page=1&page_size=20`
- `GET /municipalities/{id}/years`
- `GET /municipalities/{id}/observations?from_year=2017&to_year=2024`
- `GET /municipalities/{id}/peers?year=2024&county_scope=all&limit=5`
- `GET /comparisons?ids=<id1>&ids=<id2>&year=2024&baseline_id=<id1>`
- `GET /municipalities/{id}/simulation-context?year=2024`
- `POST /simulations`
- `GET /sources?page=1&page_size=20`
- `GET /health/live`
- `GET /health/ready`

ID je deterministički interni UUID na temelju baznog ključa iz 2021.; nije službena šifra JLS. Zagrebov alias iz 2024. vodi na isti ID. Pretraga naziva uključuje izvorne aliase, a županija razlikuje istoimene JLS. Paginacija je ograničena na 100 zapisa po odgovoru.

Decimalne metrike u JSON-u su stringovi. Baza koristi NUMERIC(24,12), a izvorne XML vrijednosti ostaju sačuvane bez promjene. Tragovi Excelove binarne preciznosti mogu zato biti vidljivi u decimalnom odgovoru; prikaz treba zaokružiti na preciznost objavljene metrike. Nedostupna metrika ima `value: null` i `reason`. API daje izvor, redak, izvorne ćelije, metodološku skupinu i probleme kvalitete. Odvojeno su imenovani objavljeni i izvedeni kg po **obuhvaćenom** stanovniku. Jedinice i ključevi definirani su u OpenAPI shemi.

`health/ready` provjerava PostgreSQL i aktualnu migraciju; status učitanih podataka vraća se zasebno kao `empty`, `partial` ili `loaded`. Baza bez podataka može biti infrastrukturno spremna.

## Podatkovna ograničenja

- Stopa odvojenog sakupljanja **nije stopa recikliranja**. Za 2022. izvorni udio se množi sa 100; izvorna ćelija ostaje očuvana.
- Jedanaest zapisa ima nesklad objavljenog kg/stan. i izvedenog 1000T/P. P i objavljena vrijednost ostaju vidljivi, uz `population_usable=false`; izvedeni pokazatelji po stanovniku su nedostupni. Razlog zahtijeva pregled, ne automatski ispravak populacije.
- Razlike XLSX/PDF agregata za 2023. i 2024. evidentirane su kao problemi izvora. Uvoz ne skalira mase da bi odgovarale PDF zbroju.
- Usporedivost godina zasad je `provisional`; granice i lokalni obuhvat nisu neovisno potvrđeni. Zasebna potvrda bilance tokova omogućuje Simulator za javnu uslugu 2023./2024., ali ne mijenja međugodišnju usporedivost niti globalno polje `methodology_verified`.
- Uvoze se Prilog 1 i sedam kategorija Priloga 2. ELOO i zasebna službena populacija još se ne učitavaju. `population_observation` je pripremljena prazna tablica; obuhvaćena populacija se ne predstavlja kao DZS podatak.
- Licenca, URL-ovi i datum preuzimanja ostaju nepotvrđeni. Ne objavljivati izvorne datoteke bez provjere licence.

Detalji: [audit podataka](docs/audit_podataka.md), [tehnička specifikacija](tehnicka_specifikacija.md).

## Provjere

```sh
docker compose run --rm api pytest -q
docker compose run --rm api alembic -c backend/alembic.ini check
docker compose run --rm api pip check
docker compose exec api python -m pipeline.smoke_api
```

Testovi rade na stvarnom PostgreSQL-u. Svaki integracijski test stvara jedinstvenu privremenu shemu, primjenjuje migraciju i na kraju uklanja samo tu testnu shemu; ne briše aplikacijske tablice u `public`. Provjeravaju izvornu skalu 2022., alias Zagreba, svih 2.224 zapisa, nalaze kvalitete, karantenu, rollback neuspjelog uvoza, aktivaciju revizije, idempotentnost, API i health ponašanje.

Dokumentacija korištenih API-ja: [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://docs.sqlalchemy.org/en/20/), [Alembic](https://alembic.sqlalchemy.org/en/latest/), [openpyxl](https://openpyxl.readthedocs.io/en/stable/).


## Waste Simulator

Otvorite http://localhost:5173/simulator ili akciju **Simuliraj ovaj cilj** u Compareu. Odaberite JLS i godinu, preusmjeravanje ili prevenciju, zatim udio početnog miješanog otpada, tone ili ciljnu stopu. Rezultat računa API; nema zasebne računske implementacije u pregledniku. Do četiri scenarija su neovisne alternative nad istom početnom JLS, godinom i revizijom izvora.

Za `T` ukupno, `M` miješano, `S=T−M` odvojeno i `D` promjenu u tonama:

| Model | Rezultat | Cilj g (%) iznad početne stope |
|---|---|---|
| Preusmjeravanje | T′=T, M′=M−D, S′=S+D | D=gT/100−S |
| Prevencija miješanog otpada | T′=T−D, M′=M−D, S′=S | D=T−100S/g, samo za S>0 |

Niži cilj zadržava početno stanje kao već dosegnut. Pri nultoj ukupnoj masi stopa je nedefinirana. Prevencija uz početni S=0 ne može proizvesti pozitivnu stopu. Parametri imaju validaciju, a izračuni koriste Decimal preciznost 40. Zaokruživanje je prikazno. `rate_pct` razlike su postotni bodovi, ne relativni postoci.

Metodološka potvrda je usko vezana uz javnu uslugu 2023./2024. i pregledane XLSX checksumove u `data/manifests/simulator_methodology.json`: Izvješće za 2024., str. 20 i 37, Tablica 11, uz korisnikovu potvrdu pregleda izvješća za obje godine. Svaki se zapis ponovno provjerava prema preciznosti mase i stope. Ova potvrda ne dokazuje lokalni kontinuitet među godinama i ne potvrđuje reciklirane količine. Nevaljana masa, neusklađena stopa, nepotvrđena revizija ili drugi obuhvat isključuju automatski izračun. Sporna populacija isključuje samo izvedene kg po stanovniku; izvorni objavljeni kg ostaju dostupni u izvorima. Upozorenja za 2023./2024. ostaju vidljiva.

Interaktivni graf masa ima tabličnu alternativu i izbor tona ili kg po obuhvaćenom stanovniku. Odvojene kartice prikazuju stopu i promjene u postotnim bodovima. Prikazane su pretpostavke, formule i početna objavljena/izračunata stopa. Sedam materijalnih kategorija ne raspodjeljuje se u scenarijima. Scenarij nije prognoza učinka mjere; matematička granica nije dokaz da je sav miješani otpad moguće odvojiti. Stopa odvojenog sakupljanja nije stopa recikliranja.

Spremanje je lokalno, u ovom pregledniku. Poveznica sadrži verziju modela, početnu reviziju i parametre; primatelj treba pristup istoj aplikaciji i podacima. JSON izvoz uključuje parametre i izvještaj; uvoz provjerava JLS, godinu, verziju i checksum te rezultate ponovno računa na API-ju. CSV donosi vrijednosti, jedinice, razlike i izvore. Ispis/PDF koristi preglednikov dijalog za ispis i uključuje tablicu i pretpostavke. Nema poslužiteljske pohrane scenarija ni korisničkih računa.

Reproducibilni audit svih izvornih redaka (bez pisanja u `podaci`):

```sh
docker compose run --rm api python -m pipeline.audit_simulator > docs/simulator_data_audit.json
```

Rezultati: [audit po retku](docs/simulator_data_audit.json) i [provjera Simulatora](docs/simulator_verification.md). Pokretanje servisa i cijelog testnog skupa jednako je prethodnim modulima; nakon promjena treba obnoviti API image i frontend build ili pokrenuti razvojni server.


## Dovršeni korisnički tok i navigacija

Početna stranica `/` ima istaknutu pretragu koja otvara profil u `/explorer` te tri ravnopravne kartice u sekciji „Kako funkcionira?”. Bjelovar je kratki primjer pretrage; Home ne prikazuje njegove podatke unaprijed niti automatski računa scenarije. Podaci i hipotetski izračuni ostaju dostupni unutar postojećih modula. Stare poveznice `/?jls=…` preusmjeravaju se na Explorer uz očuvanje odabira.

Navigacija prenosi samo odabir JLS-a, godine i usporedne skupine. Compare može zadržati vlastite filtre; reference izvora i scenarijski parametri ne kopiraju se u druge module. Promjena početnog odabira čisti stare reference, a usporednu skupinu zadržava do postojećeg ograničenja od pet JLS-ova. Nevaljana poveznica ima odabir dostupnih godina i akciju za novi scenarij; nepoznatu JLS moguće je zamijeniti pretragom. Za 2017.–2022. automatski model ostaje nedostupan.

Simulator automatski obnavlja posljednji valjani nacrt u istoj kartici preglednika (`sessionStorage`), vezan uz isti zapis, checksum i model. Nespremljene izmjene imaju vidljivu oznaku. Eksplicitna nova referenca ili dijeljiva poveznica imaju prednost; nacrt iste referentne poveznice može se obnoviti nakon osvježavanja. Obnovljeni parametri ponovno se provjeravaju i računaju na API-ju. Trajno lokalno spremanje i izvoz ostaju zasebne akcije; bez podrške pohrane moguće je raditi i izvoziti, ali automatska obnova nije zajamčena.

Ispis/PDF koristi zaseban sažeti prikaz: početno stanje, scenarije, jedinice, razlike, formule, pretpostavke, izvore i upozorenja. Navigacija, obrasci i poveznica za preskakanje sadržaja ne ispisuju se. Lokalni problemi odvojeni su od napomena o agregatima izvora; upozorenje za 2023. ostaje vidljivo.

Provjera provedena po fazama opisana je u [izvještaju poliranja proizvoda](docs/product_polish_verification.md).


## Povijesni podaci 2017.–2020.

Nakon osnovnog uvoza 2021.–2024. pokrenite `python -m pipeline.historical` prema gornjem primjeru. Potrebni su četiri CSV-a i odgovarajući PDF-ovi iz `data/manifests/historical_sources.json`. PDF za 2020. ima izvorni naziv `podaci/2020/pytest.ini.pdf`; sadržaj je izvješće o otpadu. Izvori se montiraju samo za čitanje. Uvoz provjerava checksum CSV-a/PDF-a, 556 jedinstvenih identiteta po godini, pregledane aliase i dokaz iz `historical_verification.json`; ne koristi približno povezivanje naziva. Ponovljeni uvoz preskače dovršene izvore.

Explorer i Compare podržavaju 556 JLS × 8 godina = 4.448 opažanja. Povijesne mase, obuhvaćena populacija i objavljeni kg/stan. potječu iz pregledanih PDF tablica. **Službena stopa odvojenog sakupljanja za 2017.–2020. nije dostupna u uvezenim tablicama.** Zasebni kontrolni omjer `(T−M)/T` nije službena stopa, ne ulazi u razlike stopa ili automatske uvide i ne omogućuje Simulator. Materijali su dostupni samo za uvezene 2021.–2024.; Simulator samo za 2023./2024. Nema potvrđenog kontinuiranog trenda među osam godina.

Neovisna kontrola PDF-a pronašla je 72 pogrešno izdvojena objavljena kg/stan. i jednu pogrešnu županiju. Ispravci postoje samo u obrađenim podacima s tragom CSV → PDF, stranicom i checksumom; izvorne datoteke ostaju nepromijenjene. Detalji, ograničenja i rezultati stvarnih provjera: [izvještaj integracije](docs/historical_integration_verification.md).

Dodatne reproducibilne provjere:

```sh
docker compose run --rm api python -m pipeline.audit_history > docs/historical_data_audit.json
python3 -m pipeline.verify_history_api --base-url http://localhost:8000 > docs/historical_api_verification.json
```

Druga naredba zahtijeva pokrenut API na `localhost:8000` i koristi samo Python standardnu biblioteku. Uspoređuje Explorer i Compare za sve JLS/godine. `health/ready` zadržava status osnovnog skupa, a `historical_status` zasebno označava `missing`, `partial` ili `loaded` za povijesni obuhvat.

Za obnovu dokaza na macOS-u (PDFKit), prvo izvezite postojeći kanonski registar:

```sh
docker compose exec -T db psql -U wastewise -d wastewise -tA -c "SELECT json_agg(t) FROM (SELECT id, name, county, municipality_type FROM municipality ORDER BY id) t" > /tmp/wastewise-registry.json
mkdir -p /tmp/wastewise-audit
swift -module-cache-path /tmp/wastewise-audit/cache pipeline/pdf_historical_words.swift podaci/201{7,8,9}/*.pdf podaci/2020/*.pdf
python3 -m pipeline.verify_historical --baseline /tmp/wastewise-registry.json --words-dir /tmp/wastewise-audit > /tmp/historical-verification-review.json
```

Obnovljeni dokaz prvo pregledajte; naredbe ga ne aktiviraju u projektu. Parser geometrije vezan je uz pregledane PDF verzije i raspone stranica. Za 2019./2020. empirijski odgovara interval objavljenog cijelog kg `[F,F+1)`, uz preciznost mase; to nije neovisna potvrda izdavačeve politike zaokruživanja.


## Sažeti prikaz kvalitete i naziva izvora

Korisnički prikaz koristi naziv `Prikaz odabranih podataka_JLS za GODINA.csv` za 2017.–2020. i `.xlsx` za 2021.–2024. To su prikazni nazivi: datoteke nisu fizički preimenovane, a izvorne putanje, CSV/PDF trag, hashovi i ETL reference ostaju nepromijenjeni i dostupni u detaljima izvora. Time se ne mijenja identitet izvora ni idempotentnost uvoza.

Aktualno sučelje zamjenjuje četiri povijesna bloka jednom metodološkom napomenom s proširivim objašnjenjem i poveznicama na godišnje izvore. Opće napomene `source_aggregate_mismatch` za 2023./2024. ne prikazuju se u sučelju ni ispisu; API, validacije, manifesti i prethodni auditni izvještaji ih zadržavaju. Ovo nadopunjuje ranije opise vidljivosti tih upozorenja. Nema izmjene JLS vrijednosti ili usklađivanja s nacionalnim agregatima. Lokalni problemi, sporni nazivnici, nedostupni pokazatelji i konkretna metodološka ograničenja ostaju vidljivi.


## Provjera rekonstrukcije stopa

Read-only kontrola `100×(T−M)/T` za sve novije retke:

```sh
docker compose run --rm api python -m pipeline.audit_collection_rates > docs/collection_rate_validation.json
```

Nakon dodavanja audita prvo obnovite API image (`docker compose build api`). Svih 2.224 objavljenih stopa 2021.–2024. odgovara intervalima preciznosti mase i stope. To ne potvrđuje istovjetnost povijesnih definicija: izvješće 2019. opisuje užu metodu s isključenim tokovima, dok 2020. podupire široki udio nemiješanog otpada u organizaciji JLS. Postojeći povijesni kontrolni omjer ostaje odvojen od objavljenog pokazatelja; nema novih službenih stopa, promjene masa niti proširenja Simulatora. Berek 124,20 / 100,36 t primjer je iz 2024. Detaljna odluka, preciznosti, statistika i preporuka: [metodološki izvještaj](docs/collection_rate_methodology.md), [rezultati po retku](docs/collection_rate_validation.json).


## Karta reciklažnih dvorišta i zelenih otoka

Početna stranica prikazuje 283 lokacije u 160 područja: 59 iz dostavljenih
CSV/GeoJSON/PDF datoteka s data.gov.hr i 224 dodatne lokacije iz OpenStreetMapa.
Pretraga obuhvaća svih 556 JLS iz registra aplikacije; ne tvrdi se da su sve
pokrivene lokacijama. Postojećih 8 zapisa bez koordinata sačuvano je u podatkovnim datotekama i ne prikazuje se u sučelju.

Jedinstvena tražilica prikazuje prijedloge tijekom tipkanja, županiju i broj
lokacija. Klik, Enter ili strelice + Enter odabiru područje i približavaju kartu.
Dvosmislen naziv zahtijeva odabir prijedloga. Odabir ostaje na početnoj stranici;
poveznica „Podaci o otpadu za …” zasebno otvara Explorer. Popis područja uz kartu
zamijenjen je ovom pretragom. Filtri vrste i izvora i gumb povratka na cijelu
Hrvatsku ostaju dostupni. Nacionalni prikaz grupira bliske markere pomoću Leaflet
MarkerClustera. Popis ispod karte prati trenutačni obuhvat karte nakon zumiranja, pomicanja, pretrage i filtriranja. Oblačići prikazuju samo naziv, adresu i radno vrijeme; kod nepotpunih zapisa vrstu lokacije i područje. Poveznice za preuzimanje i tehnički opisi nisu dio početnog sučelja. Podloga je OpenStreetMap uz atribuciju; za podlogu je potreban
internet, dok se lokacije i autocomplete čitaju lokalno iz pripremljenih podataka.

Izvori su odvojeni:

- `frontend/src/data/recycling-locations.json`: postojeći portalni skup.
- `podaci/reciklazna_dvorista/dodatni_izvori/reciklazna_dvorista_osm_hr.csv` i `.json`:
  dodatni OSM skup s izvornim ID-jem, poveznicom, koordinatama i datumima.
- `podaci/reciklazna_dvorista/dodatni_izvori/README.md`: metodologija, licencija,
  kvaliteta i pokrivenost; `audit.json`: isključenja, duplikati i kontrolni sažeci.
- `frontend/src/data/recycling-map.json`: pripremljeni zajednički prikaz sa
  sačuvanom oznakom izvora i kanonskim JLS ID-jevima.
- `frontend/public/data/`: odvojeni OSM CSV/JSON za preuzimanje kroz aplikaciju.

OSM dodatak objavljen je uz atribuciju © OpenStreetMap suradnici i licenciju ODbL.
Nisu korišteni Google Maps podaci. Preuzimanje snimke nije potvrda aktualnosti,
radnog vremena ili prava predaje otpada; OSM je zajednički uređivan skup i ne
predstavlja službeni registar. Poligonske lokacije prikazane su središtem obuhvata,
ne nužno ulazom. Granice područja su arhivske i služe orijentaciji. Dvorišta,
mobilne lokacije, zeleni otoci i nejasne ostale lokacije razlikuju se oznakama.

Za pripremu portalnog sloja koristi se Python s `pypdf`:

```sh
python3 -m pipeline.prepare_recycling
```

Za eksplicitno osvježavanje sirovog OSM odgovora potreban je internet; zatim
priprema radi bez mreže (standardna biblioteka). Prethodnu snimku prvo sačuvajte:

```sh
python3 -m pipeline.fetch_recycling_osm
python3 -m pipeline.prepare_recycling_external
```

Drugi korak koristi i spremljene pomoćne granice. Postojeći portali izvori ne
mijenjaju se i njihovi nedostajući podaci ne popunjavaju se pretpostavkama. Pri
promjeni snimke ažurirajte i datumski tekst izvora na početnoj stranici.

Nakon ažuriranja frontend ovisnosti u postojećem Docker volumenu:

```sh
docker compose run --rm --no-deps frontend npm ci
docker compose restart frontend
```

## Ujednačene pretrage i napomene

Sve četiri stranice koriste zajednički `PlaceAutocomplete`: prijedloge pri tipkanju,
županiju uz naziv, klik, strelice, Enter i Escape. Početna stranica pretražuje lokalni
registar za kartu; Explorer, Compare i Simulator traže prijedloge od API-ja nakon
200 ms mirovanja unosa i otkazuju zastarjele zahtjeve. Enter odabire jednoznačan
rezultat; istoimena područja zahtijevaju odabir prijedloga.


Opća objašnjenja kvalitete podataka objedinjena su u `DataNotes` („O podacima i
usporedivosti”). Konkretni problemi odabranog zapisa i nedostupni izračuni ostaju
uz podatke. Simulator čuva formule i pretpostavke u vlastitom bloku; zasebni ispis
ostaje samostalan. Promotivna zaglavlja, bočne poruke i ponovljene opće napomene
uklonjeni su iz sučelja.

## Povijesni udio otpada izvan miješanog toka

Explorer i Compare zasebno prikazuju **izračunati široki udio** `100×(T−M)/T` za 2017.–2020. (po 556 JLS). Završna provjera Rev2 za 2019. potvrdila je široki obuhvat organizacije JLS; to nije uža stopa prema Uredbi. To nije zamjena za službene stope 2021.–2024. niti potvrđen povezani trend. Izvedeni API ključ je `calculated_nonmixed_share_pct`; objavljene stope ostaju u `separate_collection_pct`.

API provjerava izvor/checksum i valjanost masa; prikaz ima zasebne oznake „Izračunato” / „Službeno objavljeno”, metodološku napomenu te detalje mase, formule i izvora. Simulator ostaje samo 2023./2024. Ova široka definicija dopunjuje raniji audit užih službenih stopa, bez promjene njegovih aritmetičkih nalaza. Detalji: [povijesni udjeli](docs/historical_shares.md). Nakon izmjene obnovite API image i frontend build; migracija ili ponovni uvoz nisu potrebni.

### Sažeti kontekst podataka u Exploreru i Compareu

KPI i referentne kartice ističu raspoloživi pokazatelj: izračunati udio za 2017.–2020. ili službenu stopu za 2021.–2024. Zajednička kompaktna komponenta „O podacima i usporedivosti” prilagođava sažetak odabranoj godini. Formule, definicije kvalitete i izvori ostaju u proširivim detaljima; konkretna upozorenja JLS ostaju vidljiva. Relevantni grafovi povezuju se s tim objašnjenjem bez ponavljanja općih odlomaka. Simulatorov prikaz ostaje isti. Provjere su opisane u [izvještaju poliranja](docs/product_polish_verification.md).


Završna metodološka provjera 2019., svih 556 PDF redaka, primjeri iz 12 županija i kontrola agregata (20,8391%, uz dokumentiranu razliku masa među tablicama): [izvještaj 2019.](docs/2019_share_methodology.md). Prethodni auditni izvještaji ostaju datirane snimke tadašnje procjene; sada je široki udio dostupan za sve četiri povijesne godine.
