# WasteWise

Waste Explorer u Reactu + TypeScriptu, povezan s FastAPI-jem i PostgreSQL-om. ETL učitava godišnje pokazatelje za 2021.–2024. iz stvarnih lokalnih izvora. Waste Compare i Waste Simulator označeni su kao „U pripremi” i nisu funkcionalni.

## Pokretanje

Potreban je pokrenut Docker Desktop s Docker Composeom i postojeće četiri XLSX datoteke pod `podaci/<godina>/`, prema `data/manifests/source_files.json`. Izvori nisu uključeni u Docker image. U postojećem checkoutu već su praćeni Gitom; to nije mijenjano. `.gitignore` sprječava dodavanje novih sirovih datoteka, ali ne uklanja prethodno praćene izvore. Provjerene verzije: Python 3.12.11, PostgreSQL 16.9; sve Python ovisnosti zaključane su u `backend/requirements.lock.txt`.

Iz korijena ovog checkouta:

```sh
docker compose build api
docker compose up -d db
docker compose run --rm api alembic -c backend/alembic.ini upgrade head
docker compose run --rm api python -m pipeline.import_data --dry-run
docker compose run --rm api python -m pipeline.import_data
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

## Frontend — Waste Explorer

Ako su migracija i podaci iz prethodnog odjeljka već učitani:

```sh
docker compose build frontend
docker compose up -d frontend
```

Otvorite **http://localhost:5173**. Upišite `Bjelovar`, pritisnite Enter ili „Pretraži”, otvorite rezultat i promijenite godinu. Upute koriste postojeći checkout; ne izrađuju dodatni worktree. Frontend servis automatski pokreće API i bazu, ali ne izvršava migracije ni uvoz.

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

## Trenutačni API

Sve rute pod `/api/v1`:

- `GET /municipalities?q=Bjelovar&county=&page=1&page_size=20`
- `GET /municipalities/{id}/years`
- `GET /municipalities/{id}/observations?from_year=2021&to_year=2024`
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
- Usporedivost godina zasad je `provisional`; granice i lokalni obuhvat nisu neovisno potvrđeni. Ciljna stopa simulatora označena je nedostupnom dok metodologija nije potvrđena.
- Uvozi se samo Prilog 1. Materijali, ELOO i zasebna službena populacija još se ne učitavaju. `population_observation` je pripremljena prazna tablica; obuhvaćena populacija se ne predstavlja kao DZS podatak.
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
