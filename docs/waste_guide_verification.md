# Waste Guide — sadržaj, izvori i provjera

Datum rada i provjere izvora: 7. studenoga 2026.

## Opseg

Stranica `/guide` zamjenjuje postojeći placeholder. Postojeća sidebar stavka i kartica na početnoj ostaju na istim mjestima; kartica sada otvara funkcionalni vodič. Početna nije redizajnirana. Dopunjeno je samo pomicanje do postojeće karte pri otvaranju `/#waste-map` s druge stranice. Nije uvedena zasebna karta ni novi podaci o lokacijama.

Nema promjena API-ja, baze, ETL-a, službenih ulaznih datoteka, formula, izračuna ili pravila kvalitete. Nema novih paketa, AI-ja, vanjskih ključeva ili korisničkih računa. Izvorni PDF-ovi nisu mijenjani.

## Funkcionalnosti i organizacija

- `frontend/src/guide/Guide.tsx`: pet cjelina, kartica predmeta, hijerarhija i kviz; lokalno React stanje, bez mrežnih zahtjeva za edukativni sadržaj.
- `data.ts`: 32 predmeta i 14 javnih primarnih izvora. Zajedničke upute održavaju se po skupinama; pojedinačne iznimke za zaprljanu kutiju od pizze i ostatke hrane ne nasljeđuju pogrešno opće odlaganje.
- Svaki predmet ima ID, naziv, sinonime, kategoriju, kratku i detaljnu uputu, pripremu, razmatranje ponovne uporabe, upozorenje, lokalni obuhvat, vrstu sustava predaje, poveznice i datum provjere.
- `domain.ts`: pretraga neovisna o veličini slova, hrvatskim dijakriticima, sinonimima i redoslijedu riječi. Uključuje kategorije i naziv EE otpada. Nepoznat predmet daje prazno stanje, nikad izmišljenu uputu.
- `content.ts`: pet razina hijerarhije, četiri teme s po tri savjeta, šest činjenica i šest pitanja s jednim točnim odgovorom i objašnjenjem.
- `guide.css`: stilovi ograničeni na vodič, prelamanje na uskim ekranima, vidljiv fokus i čitljive metodološke napomene.
- Odabrani predmet može se otvoriti preko `/guide?predmet=mobitel`; osvježavanje zadržava uputu. Uređivanje ili brisanje upita uklanja staru referencu. Nevaljan ID ne blokira pretragu.
- Kviz ne prikazuje rezultat prije odgovora, zaključava izbor nakon potvrde, prikazuje izvor uz objašnjenje, točno računa rezultat i omogućuje ponovno pokretanje. Radio kontrole podržavaju tipkovnicu; sljedeće pitanje dobiva fokus.

## Mentorove prezentacije

Pregledan je tekst svih pet PDF-ova iz `podaci`; uz izdvajanje teksta pregledani su i renderirani primjeri stranica. Radne ekstrakcije nalaze se izvan repozitorija, u privremenom direktoriju. Nisu preuzimane slike ni veći odlomci slajdova.

| Prezentacija | Opseg | Primjena |
| --- | --- | --- |
| 1_Kružna ekonomija - rješenje problema 2026.pdf | 12 stranica | Ograničeni resursi i sprečavanje nastanka otpada |
| 2_Koncepti kružne ekonomije 2026.pdf | 33 stranice | Dulja uporaba, popravak i cirkuliranje proizvoda i materijala |
| 3_Hrana i tekstil 2026.pdf | 39 stranica | Planiranje kupnje, čuvanje, popravak i ponovna uporaba tekstila |
| 4_IT i baterije 2026.pdf | 35 stranica | Cjelovita predaja EE otpada, popravak i zasebno prikupljanje baterija |
| 5_Plastika_Građevinski_Kritični 2026.pdf | 22 stranice | Izbjegavanje nepotrebne ambalaže i očuvanje materijala |

Prezentacije su tematska osnova, a osjetljive upute i važeći ciljevi dodatno su provjereni u javnim primarnim izvorima. Građevinski otpad nije dodan u početni katalog jer zahtijeva zasebne lokalne i sigurnosne upute.

## Izvori

Svi sljedeći URL-ovi otvoreni su u pregledniku izvora tijekom provjere. To potvrđuje dostupnost pri radu, ne jamči trajnu dostupnost vanjskih stranica. Naziv i URL pohranjeni su i u registru aplikacije.

| Tema | Primarni izvor |
| --- | --- |
| Papir | [Čistoća Zagreb](https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/papir-23/23) |
| Ambalažno staklo | [Čistoća Zagreb](https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/staklo-24/24) |
| Plastika i metalna ambalaža | [Čistoća Zagreb](https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/plasticna-i-metalna-ambalaza/1497) |
| Biootpad | [Čistoća Zagreb](https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/biootpad/1350) |
| EE otpad | [gov.hr](https://www.gov.hr/hr/elektricni-i-elektronicki-otpad/1328) |
| Baterije | [FZOEU](https://www.fzoeu.hr/hr/otpadne-baterije-i-akumulatori/7755) |
| Tekstil | [FZOEU](https://www.fzoeu.hr/hr/ostale-posebne-kategorije-otpada/7759) |
| Lijekovi iz kućanstva | [Hrvatska ljekarnička komora](https://www.hljk.hr/novosti/stop-opasnom-otpadu-u-ljekarnama-n640) |
| Jestivo ulje — lokalni primjer | [Komunalac Samobor](https://www.komunalac-samobor.hr/komunalac/reciklazno-dvoriste-c337) |
| Povratna naknada — samo odgovarajuća označena ambalaža | [FZOEU](https://www.fzoeu.hr/hr/otpadna-ambalaza-unutar-sustava-povratne-naknade/9313) |
| Hijerarhija postupanja s otpadom | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=LEGISSUM:waste_hierarchy) |
| Ciljevi pripreme za ponovnu uporabu i recikliranja | [Vijeće EU-a](https://www.consilium.europa.eu/en/policies/waste/) |
| Cilj odlaganja | [Europska komisija](https://environment.ec.europa.eu/topics/waste-and-recycling/landfill-waste_en) |
| Datumi na hrani | [EFSA](https://www.efsa.europa.eu/en/safe2eat/food-date-labelling) |

## Metodološke odluke i ograničenja

- Ciljevi 55 % (2025.), 60 % (2030.) i 65 % (2035.) odnose se na pripremu za ponovnu uporabu i recikliranje komunalnog otpada po masi na razini država članica. Cilj najviše 10 % odlaganja do 2035. zaseban je pokazatelj. Nema prikaza ostvarenja cilja, rangiranja JLS-ova ili izračuna manjka prema stopi odvojenog sakupljanja.
- Stopa odvojenog sakupljanja nije stopa recikliranja. Raniji udio izvan miješanog toka također nije dokaz recikliranja. Guide ne izvodi nove pokazatelje iz analitičkih podataka.
- Upute Čistoće Zagreb označene su kao lokalni primjer. Biootpad posebno razlikuje biljne ostatke od kuhane hrane, mesa, ribe i mliječnih proizvoda koje zagrebački sustav ne prihvaća u tome toku. Ne propisuju se univerzalne boje spremnika.
- Prihvat jestivog ulja potkrijepljen je primjerom Samobora; uvjeti drugih lokacija nisu potvrđeni. Lijekovi vode na ljekarničku uputu, a ne na kartu koja nema podatke o ljekarnama.
- Karta nema potvrdu prihvaćenih materijala po lokaciji. CTA zato uvijek zadržava uputu za provjeru prihvata i radnog vremena kod upravitelja. Ne dodaje se izmišljeni filtar po materijalu.
- Nisu dodane univerzalne upute za ogledala, sve vrste žarulja, oštećene baterije ni medicinske oštre predmete. Katalog sadrži štednu žarulju, ne obećanje da sve žarulje imaju isti put. Za oštećenu bateriju traži se uputa sakupljača prije postupanja.
- Brojka 71 kg iz prezentacije provjerena je kao povijesna procjena iz istraživanja 2021. za kućanstva **i poslovni sektor**, ne kao aktualan podatak samo za kućanstva. [Primarna objava Ministarstva](https://mzozt.gov.hr/novosti-8/predstavljeni-rezultati-statistickog-istrazivanja-o-otpadu-od-hrane-u-republici-hrvatskoj/8560?impaired=1). Nije uključena u UI, kako se ne bi stvarao dojam aktualne ili lokalne statistike. Novije istraživanje kućanstava ima drukčiji obuhvat i nije neposredna usporedba.
- Neprovjereni rokovi i postoci za baterije iz slajdova nisu preuzeti kao aktualne zakonske tvrdnje. Nema procjena CO₂, stabala ili zajamčenih učinaka ponašanja.
- Statički katalog zahtijeva povremenu uredničku provjeru URL-ova i aktualnosti uputa. Datum se ažurira nakon stvarne provjere, ne automatski pri buildu. Mentorove prezentacije nisu predstavljene kao potvrda svih lokalnih pravila.

## Provjere

| Provjera | Rezultat |
| --- | --- |
| Frontend unit (`npm test`) | 8/8 prolazi, uključujući 3 nova testa kataloga, pretrage i pitanja |
| Backend/podatkovni/API (`pytest -q`) | 80/80 prolazi, stvarni PostgreSQL i postojeći testovi |
| TypeScript (`npm run typecheck`) | Prolazi |
| Produkcijski frontend (`npm run build`) | Prolazi |
| Format (`npm run format:check`) | Prolazi za cijeli postojeći frontend skup |
| Whitespace (`git diff --check`) | Prolazi |
| Browser regresije na lokalnoj aplikaciji | Provjereno svih 59 različitih testova; nakon usklađivanja zastarjelih selektora svi imaju uspješnu provjeru |
| Novi Guide browser testovi | 7/7 prolazi: katalog, pretraga, izvori, nevaljan ID, refresh, sidebar, karta, hijerarhija, kviz i četiri širine |
| Pristupačnost | Axe bez prijavljenih kršenja na Guideu za 1440, 820, 390 i 320 px; tipkovnički radio izbor i fokus nakon brisanja/prelaska pitanja |
| Vizualna provjera | Pregledane desktop i mobilne snimke; bez horizontalnog overflowa, prelamanje naslova i dugih uputa |

Cijeli lokalni browser skup pokrenut je naredbom ispod. Prvi prolaz otkrio je tri ranije zastarjela testa: stari naziv/unutarnji položaj legende i uklonjene `quality-details` u Compare karticama. Testovi su usklađeni sa stvarnim postojećim prikazom, bez izmjene komponenti tih modula. Posljednji puni prolaz imao je 57/59 uspješnih testova; preostala dva zastarjela selektora zatim su ispravljena i oba pripadaju završnom ciljanom prolazu `chart-labels.spec.ts scroll-position.spec.ts` sa 7/7 uspješnih testova. Nije promijenjena aplikacija između toga punog i završnog ciljanog prolaza.

```sh
docker compose exec -T frontend npm test
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run format:check
docker compose run --rm -v ./tests:/workspace/tests:ro -v ./backend:/workspace/backend:ro -v ./pipeline:/workspace/pipeline:ro api pytest -q
docker compose run --rm --no-deps -v ./frontend/e2e:/app/e2e:ro -v ./frontend/src:/app/src:ro frontend-e2e npm run test:e2e -- --grep-invert 'production serves'
docker compose run --rm --no-deps -v ./frontend/e2e:/app/e2e:ro -v ./frontend/src:/app/src:ro frontend-e2e npm run test:e2e -- chart-labels.spec.ts scroll-position.spec.ts
```

Regresije obuhvaćaju početnu, kartu, Explorer, Compare, Simulator, povijesne podatke, mobilne grafove, izvoz/ispis, izvore i povratne navigacijske tokove. Poseban `production.spec.ts` za Renderovu izoliranu repliku nije pokrenut: ovdje se provjeravao lokalni stack i produkcijski frontend build, ne novi deploy. Njegovo očekivanje Guide naslova ažurirano je i TypeScript provjereno. Deploy nije mijenjan.

Build i dalje daje postojeću Vite napomenu za Home chunk veći od 500 kB; Guide je zasebno učitan chunk od približno 27 kB prije kompresije. Backend daje jednu deprecation napomenu iz Starlette/AnyIO ovisnosti. Nijedna nije pad provjere.

## Izmijenjene datoteke

Nove: `frontend/src/guide/{Guide.tsx,data.ts,content.ts,domain.ts,guide.css}`, `frontend/tests/guide.test.ts`, `frontend/e2e/guide.spec.ts` i ovaj izvještaj.

Dopunjene: `frontend/src/App.tsx` (lazy ruta), `Home.tsx` (aktivna Guide kartica i skok do postojeće karte), `components/Layout.tsx` (tekst Guide placeholdera), `frontend/package.json` (pokretanje svih unit datoteka) i `README.md`.

Usklađeni postojeći browser testovi: `product.spec.ts` i `production.spec.ts` (novi Guide naslov), `chart-labels.spec.ts` (postojeća vanjska legenda), `compare.spec.ts` i `scroll-position.spec.ts` (postojeće poveznice na skupove podataka umjesto uklonjenih tehničkih detalja). Izvorne provjere metrika, godina, jedinica i poravnanja ostaju.

`git diff` ne nalazi promjene u `backend`, `pipeline`, `data` ni `podaci`. Ranije izmijenjena korisnička `.DS_Store` nije dio implementacije i nije uređivana.

Vodič je funkcionalan za lokalnu videodemonstraciju. Prije prikaza javnog URL-a potreban je uobičajeni commit/push/deploy, koji ovim zadatkom nije automatski izveden.


## Naknadna vizualna dorada

Guide je dobio četiri lokalna tematska vizuala, naslov usklađen s Homeom, slikovne tematske kartice, raznolik raspored činjenica i kompaktniji prikaz kviza. Sadržaj kataloga, činjenice, izvori i logika nisu mijenjani. Završni puni lokalni browser skup sada prolazi **60/60**, uključujući dodatnu provjeru slika i usklađenosti naslova. Detalji asseta, promptovi i provjere: [vizualna dorada Guidea](guide_visual_assets.md).


## Završni sadržajni polish

Dodane su PPWR kartica s datumima i faznom primjenom, tri povezana predmeta gdje postoje smislene veze, sažetiji savjeti te zasebna statistička kartica 57,3 kg po stanovniku godišnje iz kućanstava za 2025. Katalog i dalje ima 32 predmeta; novi audit razlikuje 10 potvrđenih općih ruta i 22 lokalno ovisne upute. Fotografije i postojeći raspored nisu redizajnirani. Prolazi 11 unit i 63 lokalna browser testa, TypeScript/build i format. Popis datoteka, svih 32 provjera, izvori i preostala ograničenja: [završni sadržajni audit](waste_guide_content_audit.md).
