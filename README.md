# WasteWise

WasteWise je aplikacija posvećena odgovornom gospodarenju otpadom u hrvatskim gradovima i općinama. Objedinjuje javno dostupne podatke za 2017.–2024., kartu reciklažnih dvorišta i zelenih otoka te edukativne sadržaje.

Projekt uključuje četiri cjeline: **Waste Explorer**, **Waste Compare**, **Waste Simulator** i **Waste Guide**.

## Preduvjeti

- Instaliran **Git**.
- Instaliran i pokrenut **Docker Desktop** s Docker Composeom. Na Linuxu mogu se koristiti Docker Engine i dodatak Docker Compose.
- Internetska veza za prvo preuzimanje ovisnosti i za prikaz podloge karte.
- Slobodni lokalni portovi **5173**, **8000** i **5433**.

Nije potrebno zasebno instalirati Python, Node.js ili bazu podataka. Za zadane lokalne postavke nije potrebna `.env` datoteka ni registracija korisnika.

## Prvo pokretanje

Naredbe izvršavajte redom u terminalu. Prije sljedeće naredbe pričekajte da prethodna uspješno završi.

### 1. Preuzimanje projekta

```sh
git clone https://github.com/pb3103/datathon.git
cd datathon
```

Ako već imate projekt, otvorite terminal u njegovoj glavnoj mapi, gdje se nalazi `compose.yaml`. Izvorni podaci uključeni su u repozitorij; mapu `podaci/` nemojte premještati ni preimenovati.

### 2. Izgradnja aplikacije i pokretanje baze

Provjerite da je Docker pokrenut:

```sh
docker compose version
```

Zatim izgradite aplikaciju i pokrenite bazu:

```sh
docker compose build api frontend
docker compose up -d db
```

Prva izgradnja može potrajati zbog preuzimanja ovisnosti.

### 3. Priprema baze i učitavanje podataka

Ovaj korak je obavezan pri prvom pokretanju. Samo pokretanje kontejnera ne učitava podatke.

```sh
docker compose run --rm api alembic -c backend/alembic.ini upgrade head
docker compose run --rm api python -m pipeline.import_data
docker compose run --rm api python -m pipeline.historical
docker compose run --rm api python -m pipeline.materials
```

Naredbe pripremaju strukturu baze, učitavaju podatke za 2021.–2024., povijesne podatke za 2017.–2020. i podatke po vrstama otpada. Već uspješno učitani nepromijenjeni izvori preskaču se pri ponavljanju uvoza.

### 4. Otvaranje aplikacije

```sh
docker compose up -d api frontend
```

Otvorite **http://localhost:5173** i pričekajte da se frontend pokrene.

- **Provjera baze i podataka:** http://localhost:8000/api/v1/health/ready
- **API dokumentacija:** http://localhost:8000/docs

U provjeri spremnosti trebaju pisati `status: "ready"`, `migrations: "current"`, `data.status: "loaded"` i `historical_status: "loaded"`. Pod `active_rows_by_year` svaka godina od 2017. do 2024. treba imati **556** zapisa.

## Sljedeće pokretanje i zaustavljanje

Nakon prvog uspješnog postavljanja dovoljno je:

```sh
docker compose up -d
```

Zaustavljanje uz očuvanje podataka u bazi:

```sh
docker compose stop
```

## Preuzimanje novijih promjena

Preuzmite promjene na grani projekta, zatim obnovite kontejnere i frontend ovisnosti:

```sh
git pull
docker compose build api frontend
docker compose run --rm --no-deps frontend npm ci
```

Ako promjene uključuju strukturu baze ili podatke, ponovite naredbe iz koraka **3**. Zatim pokrenite aplikaciju:

```sh
docker compose up -d api frontend
```

## Ako se aplikacija ne pokrene

- **Docker nije dostupan:** otvorite Docker Desktop i pričekajte da se pokrene. Na Linuxu provjerite da Docker servis radi i da vaš korisnik ima pravo pristupa.
- **Port je zauzet:** zaustavite drugu aplikaciju ili kontejnere koji koriste 5173, 8000 ili 5433, pa ponovite pokretanje.
- **Nema podataka ili nedostaju godine:** ponovite korak 3 i provjerite adresu za spremnost iz koraka 4.
- **Greška pri uvozu datoteke:** provjerite da je mapa `podaci/` preuzeta u cijelosti i da datoteke nisu mijenjane. Nemojte preskakati neuspjelu naredbu.
- **Nakon ažuriranja nedostaje frontend paket:** izvršite `docker compose run --rm --no-deps frontend npm ci`, zatim `docker compose restart frontend`.

Za pregled stanja i poruka o pogreškama:

```sh
docker compose ps
docker compose logs --tail=100 api frontend db
```

## Objavljivanje

Upute za objavljivanje aplikacije dostupne su u [Render deployment](docs/render-deployment.md).
