# Popravci nakon spajanja grana — 4. studenoga 2026.

## Stvarne regresije i popravci

1. **Compare → Simulator:** vraćena akcija „Simuliraj ovaj cilj” iz postojećeg API URL-a, samo uz potvrđenu dostupnost modela za zapis. Povijesni udio nikada nije simulacijski cilj. Za nepodržane godine postoji objašnjenje i izbor 2024. Usporedna skupina, referenca i checksumovi prenose se postojećim ugovorom i ponovno provjeravaju na API-ju.
2. **Spremanje scenarija:** vraćeno lokalno spremanje/učitavanje, kopiranje dijeljive poveznice te JSON izvoz i uvoz. Koristi se prethodna implementacija s provjerama verzije modela, JLS-a, godine, ID-a opažanja i izvornog SHA-256. Učitani parametri ponovno se računaju preko API-ja. CSV/PDF i novi izgled izvještaja ostaju dostupni.
3. **Nespremljene izmjene:** vraćena statusna poruka temeljena na potpisu nacrta, uz postojeću obnovu valjanog nacrta u sessionStorage. Browser test potvrđuje osvježavanje i povratni tok među modulima.
4. **Preklapanje elemenata kartice:** dodane akcije i detalji zahtijevaju devet zajedničkih redaka umjesto sedam. Ispravljen je CSS subgrid kako upozorenje ne bi prekrivalo simulacijsku poveznicu; izbjegnut je prisilan klik u testu. Zadržano poravnanje stopa, profilnih poveznica i detalja u obje kartice.
5. **Sljedivost podataka:** zadržan novi pregledni popis provjerenih poveznica izvora. Dodani su zatvoreni detalji po godini s izvornom datotekom, listom/retkom, JLS nazivom, masama, populacijom, objavljenim i izračunatim kg/stanovniku, hashom, povijesnim PDF tragom i problemima kvalitete. U Compareu su dostupni i materijalni detalji pojedine zajednice. Dugi nizovi pravilno se prelamaju na malim zaslonima.
6. **Objavljeni pokazatelji:** Segetov objavljeni kg/stan. ponovno je vidljiv uz upozorenje u KPI kartici; izvedeni pokazatelj ostaje nedostupan. Godišnja tablica po stanovniku ponovno ima zaseban objavljeni stupac. Pod grafom povijesnih udjela u proširivim detaljima ponovno su dostupni konkretni JLS, godina, T, M, izračun i izvorni redak.

## Zastarjele provjere

Prilagođene su provjere promijenjenim nazivima gumba za prijedloge, filtra županije, tabličnih zaglavlja, naslova kartice preglednika, objašnjenja obuhvata, podrijetla pokazatelja i upozorenja o populaciji. Provjere nisu uklonjene: i dalje potvrđuju vrijednosti stvarnog API-ja, granicu od pet JLS, proširenje populacijskog raspona, izvorne nesklade, odvojenost izračunatih i objavljenih pokazatelja te nedostupnost nepouzdanih izračuna.

Stari ispisni test očekivao je jednu stranicu i jedan blok formula. Aktualni dizajn ima samostalni blok formula na drugoj stranici. Test sada razlikuje zatvoreni ekranski blok od otvorenog ispisnog bloka i potvrđuje dvije stranice. Novi test izgleda izvještaja i dalje provjerava početne kartice, formule, definicije i izvor. Interaktivne kontrole ostaju skrivene pri ispisu.

## Rezultati izvršenih provjera

- **72 backend/podatkovna testa prošla**, Ruff prošao.
- **5 frontend unit testova prošlo**.
- **41 Playwright Chromium browser test prošao** preko stvarnog lokalnog FastAPI-ja i PostgreSQL-a (41,9 s).
- Nakon posljednjeg sužavanja CSS pravila za detalje izvora ponovljene su ciljane provjere sljedivosti, poveznica, mobilnog prikaza, tipkovnice i axe pristupačnosti.
- TypeScript, produkcijski build i Prettier prošli. Postojeća Vite napomena o veličini Home paketa i upozorenje Starlette/AnyIO o zastarjelom aliasu ne sprečavaju izvršavanje.

Backend, formule, izvorne datoteke, ETL, službene stope i vremenski obuhvat Simulatora nisu mijenjani ovim popravkom. Simulator je i dalje ograničen na potvrđene 2023./2024. Zaštite izvora i kvalitete ostaju aktivne.

## Izmijenjene komponente

`Compare`, `CompareSources`, `Simulator`, `MetricCards`, `Trends`, `Sources`, `RateEvidence`, novi `ObservationDetails` i ciljani CSS. Ažurirane su povezane provjere u `compare.spec.ts`, `explorer.spec.ts`, `historical.spec.ts`, `product.spec.ts`, `scroll-position.spec.ts` i `source-links.spec.ts`.

Promjene su ostavljene u lokalnom radnom stablu za pregled; nije napravljen commit ni push.
