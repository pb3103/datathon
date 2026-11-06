# WasteWise na Renderu

Aplikacija se objavljuje kao **jedan Docker Web Service** (gotov React frontend + FastAPI)
uz **Render PostgreSQL** u Frankfurtu. `render.yaml` bira besplatne planove.
Korisnik dobiva jednu HTTPS adresu; na svom računalu ne instalira ništa.

## Prvo objavljivanje

1. Pošaljite pripremljene promjene na GitHub repozitorij `pb3103/datathon`, granu `main`.
2. Prijavite se na [Render Dashboard](https://dashboard.render.com/).
3. Odaberite **New → Blueprint** i povežite GitHub repozitorij `pb3103/datathon`.
   Ako Render još nema pristup repozitoriju, vlasnica računa odobrava pristup tom repozitoriju.
4. Odaberite granu `main` i datoteku **`render.yaml`**. Naziv Blueprinta može biti `wastewise`.
5. Provjerite da su web servis i baza na planu **Free**, zatim primijenite Blueprint.
   Ne unosite svoje lokalne lozinke. Render stvara bazu i automatski povezuje njen interni URL.
6. Pratite prvi deploy. Izgradnja uključuje frontend i provjeru svih 17 ulaznih datoteka.
   Pri pokretanju se izvršavaju migracije i uvozi podataka za 2017.–2024. i materijala za 2021.–2024.
   Očekivani završni zapis: `Verified 4,448 annual observations and 15,568 material observations.`
7. Otvorite **adresu koju Render prikaže** za servis `wastewise` (ne mora biti baš `wastewise.onrender.com`).
   Provjerite početnu kartu, pretragu, Explorer, Compare i Simulator za 2023./2024.
8. Na toj adresi provjerite `/api/v1/health/ready`: `status` treba biti `ready`,
   `data.status` i `historical_status` trebaju biti `loaded`, a svaka godina treba imati 556 zapisa.

Ne postavljajte Root Directory na `backend` ili `frontend`: potreban je cijeli repozitorij.
Ne koristite lokalni `frontend/Dockerfile`: taj Dockerfile služi razvoju.
Produkcijski Dockerfile je `deploy/Dockerfile.render`; Blueprint ga već odabire.

## Kasnije izmjene

Uredite i provjerite aplikaciju lokalno, napravite commit i push na povezanu granu.
Render automatski gradi novu verziju. Ne morate ponovno stvarati servis ili bazu.
Postojeći uvoz provjerava sažetke datoteka i preskače dovršene izvore bez dupliciranja.
Nova revizija izvornog skupa ne aktivira se automatski; to zahtijeva zaseban pregled podataka.
Postavke za javni frontend ne sadrže tajne i sve API adrese ostaju relativne (`/api/v1`).

Izmjene Docker imagea **ne brišu podatke u Render PostgreSQL-u**.
Ponovno stvaranje ili brisanje same baze zasebna je radnja i briše njen sadržaj.
Za povratak ranije aplikacije koristite Renderov rollback; on ne poništava migracije baze.

## Sigurnost

- Baza ima `ipAllowList: []`: nema javnog pristupa, aplikacija koristi internu Render vezu.
- Lozinka i `DATABASE_URL` nastaju na Renderu; ne spremaju se u Git niti u frontend.
- Produkcijska postavka prihvaća Renderov `postgresql://` URL i koristi instalirani psycopg 3 driver.
- Server radi kao korisnik bez administratorskih ovlasti, bez razvojnog Vite servera i debug moda.
- API ne sadrži javne endpointove za uređivanje ili uvoz baze. POST simulacije računa rezultat bez spremanja.
- Migracije i uvoz kratko koriste zapisivanje; runtime veze imaju zadani read-only način rada i SQL timeout.
  To je dodatno ograničenje transakcija, nije zamjena za zasebnu baznu ulogu ako aplikacija kasnije dobije upis.
- CSP, zabrana ugradnje u iframe, provjera Host zaglavlja i `nosniff` uključeni su u produkciji.
  CSP dopušta slike karte sa `tile.openstreetmap.org`; ne dopušta proizvoljne skripte s drugih domena.
- Za jedan proces ograničeno je ukupno 600 API zahtjeva/min i 120 simulacijskih zahtjeva/min.
  Ograničenja su zajednička svim posjetiteljima, ne predstavljaju korisničke račune i resetiraju se pri restartu.
  Renderova mrežna zaštita i dalje je potrebna za napade na infrastrukturu.
- Tijelo POST zahtjeva ograničeno je na 32 KiB. Health provjere i statičke datoteke ne troše API limit.
- API dokumentacija (`/docs`, `/redoc`, `/openapi.json`) ostaje dostupna lokalno, a isključena je u produkciji.
- CORS ne služi kao prijava ili kontrola ovlasti. Ovdje frontend i API dijele istu domenu, pa dodatne CORS domene nisu potrebne.

## Ograničenja besplatnog Rendera

Prema službenim uputama provjerenima 6. 11. 2026.:

- Web servis se uspavljuje nakon 15 minuta bez prometa; prvo otvaranje nakon toga može trajati približno minutu,
  uz dodatno vrijeme naših provjera pri pokretanju.
- Besplatna PostgreSQL baza **istječe 30 dana nakon stvaranja**. Besplatni plan nema sigurnosne kopije.
- Lokalni filesystem servisa nije trajan; originalni ulazi i frontend dolaze iz Docker imagea, a podaci su u PostgreSQL-u.
- Free nema pre-deploy naredbu, zato se migracije i idempotentni uvoz rade na početku pokretanja servera.
- Postoje ograničenja mjesečnih resursa. Za završnu predaju treba provjeriti dostupnost baze i po potrebi prijeći na plaćeni plan.

Za predaju uz URL zadržite barem kratki README s opisom modula, korištenim podacima i ograničenjima.
Hosting uklanja potrebu da ocjenjivači instaliraju aplikaciju, ali ne zamjenjuje dokumentaciju koju natjecanje zahtijeva.

## Lokalna provjera iste produkcijske verzije

Testira se na **zasebnoj testnoj bazi**, nikad brisanjem ili ponovnim inicijaliziranjem postojeće lokalne baze.
Za build: `docker build -f deploy/Dockerfile.render -t wastewise-render:local .`

Izolirana provjera bez utjecaja na razvojnu bazu:

```bash
docker compose -p wastewise-render-qa -f compose.render-qa.yaml up -d
docker compose -p wastewise-render-qa -f compose.render-qa.yaml run --rm --no-deps checks npx playwright test e2e/production.spec.ts
docker compose -p wastewise-render-qa -f compose.render-qa.yaml stop
```

Testna baza je privremena (`tmpfs`), a web servis ograničen na 512 MiB RAM-a.
Lokalna testna adresa je `http://localhost:10100`; za test se ne koristi razvojna baza na portu 5433.
Provjereni su prvi uvoz, restart bez duplikata, zabrana SQL upisa te svi moduli kroz produkcijski frontend.
Runtime zahtijeva `DATABASE_URL`, `RENDER_EXTERNAL_HOSTNAME` i port (`PORT`, zadano 10000).
Render te postavke inače zadaje automatski. Izvori su uključeni u image i provjereni pri buildu.

## Službene upute

- [Docker na Renderu](https://render.com/docs/docker)
- [Blueprint konfiguracija](https://render.com/docs/blueprint-spec)
- [Automatski deploy iz GitHuba](https://render.com/docs/deploys)
- [Ograničenja besplatnog plana](https://render.com/docs/free)
