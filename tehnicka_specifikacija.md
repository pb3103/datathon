# WasteWise — tehnička specifikacija

## Namjena i funkcionalnosti

WasteWise objedinjuje podatke o komunalnom otpadu u hrvatskim gradovima i općinama, lokacije za odlaganje otpada i edukativni sadržaj. Aplikacija je javno dostupna i ne zahtijeva korisnički račun.

| Dio aplikacije | Funkcionalnosti |
|---|---|
| Početna stranica `/` | Pretraga područja s prijedlozima tijekom tipkanja, karta reciklažnih dvorišta i zelenih otoka, filtri vrste i izvora te popis lokacija koji prati prikaz karte. |
| Waste Explorer `/explorer` | Pregled pokazatelja odabranog mjesta za 2017.–2024., godišnji grafovi i tablice te poveznice na izvore. |
| Waste Compare `/compare` | Usporedba 2–5 mjesta, automatski prijedlozi prema broju stanovnika obuhvaćenih uslugom, razlike prema početnoj lokaciji i godišnji prikazi. |
| Waste Simulator `/simulator` | Do četiri neovisna scenarija preusmjeravanja ili prevencije za provjerene zapise iz 2023. i 2024.; unos postotka, tona ili ciljnog postotka te izvoz CSV-a i PDF izvještaja. |
| Waste Guide `/guide` | Pretraga uputa za odlaganje predmeta, hijerarhija postupanja s otpadom, savjeti za smanjenje otpada, EU ciljevi, zanimljivosti i kviz. |

## Arhitektura

- **Frontend:** React, TypeScript i Vite; Recharts za grafove, Leaflet i OpenStreetMap za kartu te MarkerCluster za grupiranje lokacija.
- **Backend:** Python, FastAPI i Pydantic; SQLAlchemy za pristup bazi i Alembic za migracije.
- **Baza:** PostgreSQL 16.
- **Obrada podataka:** Python postupci u `pipeline/` za čitanje, provjeru i uvoz XLSX datoteka i pregledanih CSV prijepisa PDF tablica.
- **Pokretanje:** Docker Compose lokalno; Docker web servis i PostgreSQL na Renderu za objavljenu aplikaciju.

Frontend dohvaća analitičke podatke i rezultate izračuna preko REST API-ja. Karta i edukativni katalog koriste pripremljene podatke uključene u frontend. Izvorne tablice ne obrađuju se pri korisničkom otvaranju stranice.

## Podaci i kvaliteta

Analitički skup obuhvaća **556 gradova i općina kroz osam godina, 2017.–2024.** Podaci dolaze iz godišnjih izvješća i pripadajućih tablica o komunalnom otpadu. Za 2021.–2024. dostupno je i sedam materijalnih kategorija u kg po stanovniku.

Lokacije na karti potječu iz skupova portala **data.gov.hr** i **OpenStreetMapa**, uz odvojeno sačuvane izvore. Pokrivenost nije potpuna; prikazuju se zapisi s koordinatama. Podaci vodiča temelje se na edukativnim materijalima i javnim uputama, uz registar izvora.

Uvoz provjerava strukturu datoteka, kontrolne sažetke SHA-256, identitet mjesta, duplikate i valjanost vrijednosti. Ponovljeni uvoz nepromijenjenog izvora ne duplicira podatke. Zapisi zadržavaju vezu s izvorom, godinom i retkom, a problemi kvalitete bilježe se zasebno.

Glavni entiteti baze su mjesta i njihovi alternativni nazivi, izvori, uvozi, godišnji pokazatelji, materijalni pokazatelji, stanovništvo i problemi kvalitete. Decimalne vrijednosti računaju se bez gubitka preciznosti; nedostajući podatak nije zamijenjen nulom.

## Pokazatelji i izračuni

- Količina po obuhvaćenom stanovniku računa se kao `1.000 × količina u tonama / broj obuhvaćenih stanovnika`, samo kada je broj stanovnika valjan.
- Za 2017.–2020. prikazuje se izračunati udio izvan miješanog toka: `100 × (ukupno − miješano) / ukupno`.
- Za 2021.–2024. stopa odvojenog sakupljanja preuzima se iz izvora. Ona nije isto što i postotak recikliranog otpada.
- Godine bez potvrđene usporedivosti prikazuju se zasebno, bez povezivanja u kontinuirani trend.
- Compare prednost daje mjestima s upola do dvostruko većim brojem obuhvaćenih stanovnika od početne lokacije. Ako ih nema dovoljno, uključuje najbliža dostupna mjesta izvan raspona. Županija je dodatni filtar.

Simulator svaki scenarij računa iz istog početnog stanja:

- **Preusmjeravanje:** smanjuje se miješani otpad, a jednaka količina prelazi u odvojeno sakupljeni tok; ukupna količina ostaje ista.
- **Prevencija:** ukupni i miješani otpad smanjuju se za jednaku količinu; odvojeno sakupljena količina ostaje ista.

Izračun je hipotetski i ne procjenjuje troškove ni ostvarivost mjera. Backend provjerava ulaze, dopuštenu godinu i reviziju izvora. Rezultati se ne spremaju u bazu; valjani unosi privremeno se pamte u kartici preglednika.

## API

Rute koriste prefiks `/api/v1`.

| Ruta | Namjena |
|---|---|
| `GET /municipalities` | Pretraga mjesta. |
| `GET /municipalities/{id}/years` | Dostupne godine. |
| `GET /municipalities/{id}/observations` | Pokazatelji i izvori odabranog mjesta. |
| `GET /municipalities/{id}/peers` | Prijedlozi za usporedbu. |
| `GET /comparisons` | Usporedba odabrane skupine. |
| `GET /municipalities/{id}/simulation-context` | Početni podaci i dostupnost simulacije. |
| `POST /simulations` | Izračun scenarija. |
| `GET /sources` | Popis izvora. |
| `GET /health/live`, `GET /health/ready` | Dostupnost servisa, baze, migracija i status učitanih podataka. |

API vraća strukturirane pogreške i razloge nedostupnosti pokazatelja. Lokalna dokumentacija dostupna je na `http://localhost:8000/docs`.

## Sučelje i sigurnost

Sučelje je prilagođeno računalu i mobitelu, s mobilnim izbornikom, pretragom s automatskim prijedlozima i alternativnim tabličnim prikazima grafova. Brojevi koriste hrvatski zapis, a mjerne jedinice prikazuju se uz vrijednosti. Promjena odabira unutar stranice zadržava položaj scrolla.

Produkcijska konfiguracija ograničava pristup bazi na čitanje nakon inicijalizacije, broj API zahtjeva, veličinu zahtjeva i trajanje upita. Primjenjuju se provjera ulaza, dopuštenih hostova i sigurnosna HTTP zaglavlja. Baza na Renderu nije javno otvorena, a frontend i API koriste istu HTTPS adresu.

## Pokretanje i provjere

Upute za lokalnu instalaciju, migracije i uvoz podataka nalaze se u [README-u](README.md), a objavljivanje je opisano u [uputama za Render](docs/render-deployment.md).

Projekt uključuje testove obrade podataka, izračuna i API-ja te Playwright provjere korisničkih tokova, mobilnog prikaza i pristupačnosti. Frontend se provjerava TypeScript provjerom i produkcijskom izgradnjom.
