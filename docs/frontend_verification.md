# Waste Explorer — provjera prvog korisničkog sučelja

Datum: 29. listopada 2026. Implementirano u postojećem checkoutu, bez promjene izvornih datoteka ili backenda. React 18.3.1, TypeScript 5.8.3, Vite 6.4.5, Recharts 3.10.1; verzije i tranzitivne ovisnosti zaključane u `frontend/package-lock.json`.

## Implementirano

- Hrvatski responzivan Explorer s pretragom JLS, županijom uz rezultate i odabirom stvarno dostupnih godina.
- Kartice ukupne i miješane mase, izračunatih kg po obuhvaćenom stanovniku i objavljene stope odvojenog sakupljanja. Objavljeni kg/stan. zasebno su označeni.
- Prikazi masa, kg/obuhvaćenom stanovniku i stope kroz 2021.–2024.; svaki ima grafikon, tablicu, jedinicu, obuhvat i izvor.
- Metodološki nepotvrđene godine nisu povezane linijom. Nema klijentskog izračuna pokazatelja ili godišnjih promjena. Miješani stupci imaju i uzorak, uz legendu i tipkovnički dostupne vrijednosti.
- Upozorenja XLSX/PDF za 2023. i 2024. uvijek su vidljiva uz pregled, neovisno o odabranoj godini. Neskladi i razlozi nedostajućih metrika imaju razumljiva objašnjenja.
- Izvori s nazivom datoteke, listom, retkom i SHA-256; nepotvrđene licence, datumi i URL-ovi jasno su označeni.
- URL čuva `jls` i `godina`, uključujući refresh i natrag/naprijed. Nedostupna zatražena godina ne zamjenjuje se drugom bez odabira korisnika.
- Učitavanje, prazan rezultat, nedostajući podatak, neuspjeli zahtjev i ponovni pokušaj imaju zasebne prikaze. Napušteni zahtjevi se prekidaju; timeout je 15 sekundi.
- Compare i Simulator su neaktivni i označeni „U pripremi”. Stopa odvojenog sakupljanja nije predstavljena kao recikliranje.

## Stvarni ugovor i podaci

`frontend/openapi.json` preuzet je iz pokrenutog FastAPI-ja. `src/api/schema.d.ts` generiran je pomoću `openapi-typescript`. Preglednik koristi isti origin i `/api/v1` proxy prema `api:8000`; nema fixturea ili ugrađenih mjerenja u aplikaciji.

Provjeren Bjelovar, interni ID `2f926aee-008e-515c-ac7c-c1a2a8331c2d`: 2024. ukupno 9.773,87 t i stopa 32,27 %, 2023. ukupno 9.187,54 t, 2022. ukupno 9.035,00 t i stopa 16 %. Promjena godine prikazuje odgovarajući API zapis.

Za Seget 2024. aplikacija zadržava objavljenih 363,99 kg/stan., a izvedeni pokazatelj prikazuje kao „Nema podatka” s razlogom. Ukupna masa 1.698,02 t ostaje dostupna. Za Imotski 2024. izričita nulta stopa ostaje 0,00 %, a ne nedostajući podatak.

## Provedene provjere

- `npm run build`: strogi TypeScript svih komponenti i testova te produkcijski build prolaze. Grafički paket učitava se odvojeno od početnog sučelja; nema upozorenja o prevelikom početnom paketu.
- `npm test`: tri provjere prolaze — nula/nedostajuće/nevaljane metrike, pravila prekida trenda i očuvanje odabira u URL-u.
- `npm run format:check`: prolazi; posljednje promjene također su formatirane istim zaključanim alatom.
- Instalacija zaključanih ovisnosti prijavila je nula poznatih ranjivosti u trenutku provjere.
- Završni Playwright/Chromium prolaz: **8 od 8 testova prolazi nad produkcijskim `dist/`**, preko stvarnog FastAPI-ja i PostgreSQL-a.

Browser provjere uključuju:

1. Pretraga → Bjelovar → promjene godina → tablica → refresh i natrag; stvarni odgovor API-ja s četiri opažanja i bez JavaScript pogrešaka.
2. Segetov nesklad, odvojene objavljene i izvedene vrijednosti te provjerljiv izvor.
3. Tipkovnička pretraga i odabir, prikaz na 390 × 844 px, jedan stupac kartica i bez vodoravnog pomaka cijele stranice.
4. Prazan rezultat pretrage i izričito tražena nedostupna godina 2030.
5. Kontrolirani prekid mrežnog zahtjeva, bez starih kartica, zatim oporavak preko stvarnog API-ja.
6. Kontrolirano zadržavanje zahtjeva radi provjere stanja učitavanja, nakon čega nastavlja stvarni zahtjev.
7. Izričita nulta stopa i odsutnost povezujuće linije za uvjetno usporedive godine.
8. Automatska axe provjera WCAG 2 A/AA i 2.1 AA pravila na desktop grafikonu i mobilnoj tablici, bez prijavljenih povreda u tim prikazima.

Graf je dodatno provjeren fokusom i strelicom na tipkovnici; pojavljuju se godišnje vrijednosti. Desktop i mobilne snimke vizualno su pregledane. Izvještaji, snimke i tragovi pada testova nalaze se u ignoriranom `frontend/test-results/`.

Ugrađeni preglednik sesije nije bio dostupan, pa je browser provjera obavljena lokalnim Playwright Docker imageom. Automatizirana provjera i vizualni pregled nisu potpuni ručni audit čitača zaslona ili svih preglednika. Sintetske provjere formatiranja jasno su odvojene u `frontend/tests/`; glavni browser tok nije koristio lažirane podatke.

## Pokretanje i preostali opseg

Upute su u `README.md`. Razvoj: `docker compose up -d frontend`; produkcijski lokalni pregled nakon builda: `docker compose -f compose.yaml -f compose.preview.yaml up -d frontend`. Adresa je `http://localhost:5173`. Preview je za lokalnu provjeru, bez javne objave.

Preostaju Waste Compare, Waste Simulator te nerazriješena podatkovna/metodološka pitanja iz audita. Izvorni podaci nisu mijenjani; SHA-256 svih osam datoteka ponovno je potvrđen.
