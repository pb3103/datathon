# WasteWise

WasteWise je aplikacija posvećena odgovornom gospodarenju otpadom u hrvatskim gradovima i općinama. Objedinjuje javno dostupne podatke, kartu mjesta za odlaganje otpada i edukativne sadržaje u jednu cjelinu.

Projekt uključuje **Waste Explorer**, **Waste Compare**, **Waste Simulator** i **Waste Guide**.

## Lokalno pokretanje

Potrebni su **Git** i instaliran, pokrenut **Docker Desktop** s Docker Composeom.

Preuzmite projekt:

```sh
git clone https://github.com/pb3103/datathon.git
cd datathon
```

Pri prvom pokretanju iz korijena projekta izgradite aplikaciju, pripremite bazu i učitajte podatke:

```sh
docker compose build api frontend
docker compose up -d db
docker compose run --rm api alembic -c backend/alembic.ini upgrade head
docker compose run --rm api python -m pipeline.import_data
docker compose run --rm api python -m pipeline.historical
docker compose run --rm api python -m pipeline.materials
docker compose up -d api frontend
```

Izvorne datoteke nalaze se u mapi `podaci/` i trebaju ostati na svojim mjestima. Za zadane lokalne postavke nije potrebna `.env` datoteka.

- **Aplikacija:** http://localhost:5173
- **API dokumentacija:** http://localhost:8000/docs

## Ponovno pokretanje i zaustavljanje

Za sljedeće pokretanje ili nakon preuzimanja promjena:

```sh
docker compose up -d --build
```

Zaustavljanje uz očuvanje podataka u bazi:

```sh
docker compose stop
```

Upute za objavljivanje dostupne su u [Render deployment](docs/render-deployment.md).
