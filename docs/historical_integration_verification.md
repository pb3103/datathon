# WasteWise — integracija i provjera 2017.–2024.

Datum: 31. listopada 2026. Provjeren lokalni FastAPI/PostgreSQL i produkcijski frontend preview. Ovo nije potvrda da su svi administrativni podaci izdavača sadržajno točni.

## 1. Implementacija

Dodani su pregledani CSV/PDF adapter postojećeg transakcijskog ETL-a, manifesti izvora i dokaza te eksplicitni aliasi JLS-ova. Baza koristi postojeće tablice i interne identifikatore iz 2021.; nova migracija nije potrebna. Uvoz zahtijeva podudaranje SHA-256 CSV-a i PDF-a, pregledani dokaz, 556 jedinstvenih kanonskih JLS-ova i valjane mase/populaciju. Nejasno mapiranje ili promjena izvora zaustavlja uvoz.

Explorer i Compare prihvaćaju 2017.–2024., s povijesnim obuhvatom, izvorima, nedostupnim pokazateljima i zasebno označenim kontrolnim omjerom masa. Početna stranica i zaglavlje navode prošireno razdoblje. OpenAPI snimka i TypeScript tipovi obnovljeni su. Arhitektura, navigacija, vizualni identitet i algoritam sličnosti ostaju postojeći. Upute su u README-u.

Izvori nisu mijenjani. Izvorni CSV retci, izvorne vrijednosti, PDF stranica, tokeni, hash i obrazloženje korekcije čuvaju se uz obrađeni podatak. Izvori se ne obrađuju iznova tijekom korisničkog zahtjeva.

## 2. Broj zapisa i pokrivenost pokazatelja

| Godina | Zapisi / jedinstvene JLS | Objavljena stopa | Sporan nazivnik za izvedene kg/stan. | PDF korekcije povijesnih redaka |
|---|---:|---:|---:|---:|
| 2017. | 556 / 556 | nedostupna | 0 | 27 |
| 2018. | 556 / 556 | nedostupna | 0 | 21 |
| 2019. | 556 / 556 | nedostupna | 0 | 25 |
| 2020. | 556 / 556 | nedostupna | 0 | 0 |
| 2021. | 556 / 556 | 556 | 1 | — |
| 2022. | 556 / 556 | 556 | 1 | — |
| 2023. | 556 / 556 | 556 | 0 | — |
| 2024. | 556 / 556 | 556 | 9 | — |

Ukupno **4.448 opažanja i 556 različitih internih JLS identiteta**. Skup identiteta jednak je u svih osam godina; nema duplikata ili nedostajuće JLS unutar tog registra. To nije neovisna potvrda granica ili službenih šifara JLS.

Sve godine imaju ukupnu i miješanu masu u tonama, obuhvaćenu populaciju i objavljeni kg/stanovnik. Izvedeni kg/stanovnik računa se kao `1000 × masa / obuhvaćena populacija`, osim kod spornih nazivnika. Objavljeni kg ostaju zasebno dostupni. Sedam materijala dostupno je samo iz postojećih uvoza 2021.–2024. (15.568 vrijednosti), uz prethodne zaštite kvalitete. Nisu izmišljene materijalne vrijednosti starijih godina.

## 3. Neovisna kontrola povijesnih izvora

CSV je UTF-8 s BOM-om, razdvojen zarezima; decimalne točke obrađuju se kao Decimal. Provjereni su stvarni stupci, jedinice, sve četiri numeričke veličine po retku, nedostajuće vrijednosti i godine. U svakom CSV-u ima 556 redaka; obvezne numeričke vrijednosti nisu prazne.

Dostupni su svi izvorni PDF-ovi. PDFKit geometrija tablica uspoređena je s **2.224 retka × četiri numerička polja** (T, M, P, objavljeni kg/stan.). Provjereni rasponi stranica: 2017. 92–101; 2018. 95–104; 2019. 119–135; 2020. 104–113. Naziv PDF-a `podaci/2020/pytest.ini.pdf` ne opisuje sadržaj: pregledani dokument jest izvješće za 2020. Evidencija je u `data/manifests/historical_verification.json`, a reprodukcijski alati u `pipeline/pdf_historical_words.swift` i `pipeline/verify_historical.py`.

Ispravak za 2018. (`ispravak_0.docx`) odnosi se na Tablicu 19, str. 37, međužupanijski prijevoz; ne mijenja uvezene JLS retke Priloga 1.

## 4. Pronađene i ispravljene pogreške

**72 pogreške izdvajanja objavljenih kg/stanovnik:** 26 u 2017., 21 u 2018., 25 u 2019. Razdjelnik tisućica u PDF-u pogrešno je protumačen pri ranijem izvlačenju. Primjer: Janjina 2017., PDF `1.361`, CSV `1`, pregledana vrijednost **1.361 kg/stan.**; izvedena vrijednost 1.361,16 kg/stan. Uvoz koristi PDF dokaz, a ne nagađanje iz izvedene vrijednosti. Sve korekcije imaju oznaku `pdf_verified_correction` i ostavljaju CSV netaknutim.

**Jedna pogrešna županija:** `SVETA NEDJELJA`, CSV 2017. redak 552, pripisana Istri. PDF str. 101 smješta je u Zagrebačku županiju: T=4.000,32 t, M=3.215,65 t, P=18.058. Zasebna istarska `SVETA NEDELJA` je na str. 94: T=988,68 t, M=876,90 t, P=2.987. Pogrešno spajanje zaustavljeno je kontrolom duplikata prije uvoza; nakon pregleda uveden je eksplicitni alias s dokazom.

Identiteti nisu povezivani samo nazivom. Provjereni su županija, postojeći UUID i pregledani dvojezični/nazivni aliasi. Novigrad Zadarska, Novigrad/Cittanova Istarska i Novigrad Podravski ostaju tri različita identiteta; istoimeni Otok i Privlaka također ostaju odvojeni. Vrsta JLS-a i službene šifre nisu izmišljene gdje ih postojeći registar nema.

## 5. Matematička validacija svih osam godina

Read-only audit `pipeline/audit_history.py` ponovno obrađuje sve izvore. Nisu pronađene negativne mase, M>T ni nepozitivna obuhvaćena populacija. Svih 4.448 opažanja preko stvarnog API-ja dodatno je provjereno neovisnim Decimal izračunom jedinica i izvedenih kg/stanovnik. Kod 11 postojećih spornih nazivnika izvedeni kg ostaju nedostupni; objavljene vrijednosti i problemi nisu prepravljeni.

Za 2017./2018. nakon PDF korekcija svi objavljeni cijeli kg odgovaraju intervalu najbližeg cijelog broja, uz preciznost mase. Za 2019./2020. svim redcima odgovara interval `[F,F+1)`, uz preciznost mase, umjesto pretpostavke najbližeg cijelog broja. To je **empirijska kontrola preciznosti**, a ne neovisna potvrda izdavačeve politike zaokruživanja. Mase 2017.–2019. objavljene su na 0,01 t, 2020. u cijelim tonama. Objavljeni i izvedeni kg nisu zamijenjeni jedan drugim.

Skala stope 2022. i postojeća pravila 2021.–2024. ostaju nepromijenjeni. Nula je vrijednost; nedostupnost je `null` s razlogom, nikad zamjenska nula.

## 6. Metodološke razlike i nerazjašnjene anomalije

CSV stupac nazvan izračunatom stopom nije službeno objavljena stopa. **Za 2017.–2020. službena stopa ostaje nedostupna.** Kontrolni `(T−M)/T × 100` prikazan je zasebno, s `review_required`, bez tvrdnje da je stvarno odvojeno sakupljanje. Ne ulazi u razlike službenih stopa, automatske uvide ni Simulator.

Posebno 2019.: naslov ukupne mase uključuje javnu uslugu i uslugu povezanu s javnom uslugom, dok miješana masa navodi javnu uslugu SO-1. Zato se njihova razlika ne proglašava potvrđenim odvojenim tokom. Naslovi 2020. navode organizaciju JLS; stariji SO-1 obuhvat nije automatski izjednačen s novijim. Sve međugodišnje usporedbe ostaju privremene, bez potvrđene povezujuće linije, uz upozorenja. Odvojeno sakupljanje nije recikliranje.

Analitički pregled svih godina nalazi sljedeće **kandidate za pregled, ne dokaz pogreške**:

- 161 opažanje s izvedenim ukupnim kg/stan. >1.000;
- 236 označenih susjednih promjena prema pragovima audita: masa/kg >100% relativno ili populacija >25%;
- 71 promjenu objavljene stope od najmanje 15 postotnih bodova;
- 168 promjena kontrolnog omjera od najmanje 15 bodova, koje nisu promjene službene stope.

Skupine se preklapaju; brojke se ne zbrajaju u broj loših redaka. Primjer Stupnik: T=71,76 t (2017.) → 997,59 t (2018.), približno +1.290%; obje vrijednosti potvrđene su u PDF-u, **uzrok nije utvrđen**. Zdenci 49,35→345,66 t također zahtijevaju sadržajni pregled. Promjene Plaškog 2021./2022. i Dvora 2022./2023. očuvane su prema izvoru. Nisu pripisane turizmu, politici ili grešci bez dokaza.

Zbrojevi u auditnom JSON-u služe kontroli uvezenih JLS redaka i **nisu nacionalni ukupni otpad**. Obuhvat se mijenja; iz njih se ne zaključuje napredak ili pogoršanje. Postojeća upozorenja XLSX/PDF agregata 2023./2024. ostaju vidljiva. Globalni `methodology_verified` nije promijenjen.

## 7. Explorer

Svih osam godina dostupno je u odabiru, karticama, grafu i tablici. Povijesni obuhvat jasno je označen; objavljeni kg imaju PDF trag, a službena stopa pokazuje nedostupnost s razlogom. Kontrolni omjer zasebno je označen. Godine bez potvrđenog kontinuiteta ostaju zasebni stupci, bez zaključka o poboljšanju. Izvori prikazuju CSV redak i PDF stranicu/hash. Mobilni prikaz nema globalno horizontalno prelijevanje u provjerenom toku.

## 8. Compare

Ručni odabir, prijedlozi i prikazi rade za svih osam godina. Algoritam `covered-population-v2` ostaje jednak: obuhvaćena populacija, prioritet omjera 0,5–2, označeno proširenje i opcijski filtar županije. Ishodi otpada nisu kriterij sličnosti.

Mase i izvedeni kg uspoređuju se u istoj godini, uz provjeru obuhvata i nazivnika. Objavljeni kg ostaju zasebni. Nedostupne stare stope i materijali ne stvaraju razlike ili uvide. Razlike stopa ostaju postotni bodovi, a relativni raspon uvide deterministički opisuje, bez uzročnih zaključaka.

Stvarni API audit usporedio je Explorer i Compare za **svih 4.448 JLS/godina**, ukupno **26.736 ćelija metrika** uključujući preklapanje zadnje grupe: sve podudarno. Provjerene su i dostupnost/null vrijednosti, povijesni kontrolni omjer te izvedene jedinice. Detalji: `historical_api_verification.json`.

## 9. Simulator

Matematički modeli, metodološki manifest i zaštite bilance nisu promijenjeni. Simulator ostaje dostupan samo za provjerene 2023./2024. API prihvaća povijesnu godinu za čitljiv kontekst nedostupnosti, ali odbija automatski scenarij za 2017.–2022. Linkovi iz Explorera/Comparea to poštuju. Povijesne napomene koje ne pripadaju scenariju nisu dodane u ispis 2024.; upozorenja relevantna za 2023./2024. ostaju.

## 10. Stvarno provedene provjere

- **43 pytest testa prošla** na stvarnom PostgreSQL-u: postojeći ETL, kvaliteta, materijali, Compare, Simulator i četiri nova povijesna testa. Nova provjera potvrđuje 2.224 PDF mapiranja, korekcije, odvojene identitete, sve godine API-ja, idempotentnost, očuvanje postojećih zapisa i odbijanje izmijenjenog checksuma.
- Ponovljeni uvoz na aplikacijskoj bazi: sva četiri izvora `skipped / checksum_already_imported`, bez duplikata (`historical_import_verification.json`).
- **4 frontend unit testa prošla**; TypeScript, produkcijski build, Prettier i Ruff prošli. Alembic kontrola nije pronašla nove migracijske operacije; `pip check` nije pronašao neusklađene ovisnosti. Live API smoke test za izvorne 2021.–2024. prošao je uz dostupnost svih osam godina. SHA-256 svih 17 evidentiranih izvornih datoteka odgovara manifestima.
- **28 Playwright Chromium browser testova prošlo** preko stvarnog API-ja i baze; nema mock podataka u analitičkim tokovima. Postojeći kontrolirani mrežni testovi namjerno simuliraju prekid/zadržavanje zahtjeva. Stari test s očekivanjem četiri godine ažuriran je na točan skup osam godina; testovi nevaljane 2020. godine koriste 2016., dok zaseban test provjerava stvarnu, ali simulacijski nepodržanu 2020.
- Uključene su axe provjere pristupačnosti, tipkovnička navigacija, mobilni prikaz, URL/povratni tokovi, referentni cilj, spremanje scenarija, izvoz i sažeti PDF/ispis.
- Dodatna cjelovita live API kontrola: 556 profila, 4.448 opažanja i potpuna usporedba vrijednosti među modulima; rezultat `passed`.

In-app Browser prijavio je `Browser is not available: iab`; stvarno testiranje obavljeno je Docker Playwright Chromiumom. Nisu testirani Safari, Firefox niti fizički mobilni uređaj.

## 11. Konkretni primjeri u pregledniku

- Bjelovar: pretraga, svih osam godina, kartice prema stvarnom API-ju, osam tabličnih redaka, diskretni graf i vidljivo upozorenje 2023.
- Bjelovar/Samobor: promjena kroz svih osam godina, mase i objavljene stope prema API-ju, nedostupna stara stopa/materijali, prijedlozi za 2017., mobilna pristupačnost.
- Sveta Nedelja: dvije županije, 2017. mase 4.000,32 t i 988,68 t, različiti identiteti.
- Janjina: objavljeni PDF kg/stan. 1.361 umjesto sirovog CSV-a 1, dostupna stranica i trag ispravka.
- Simulator: 2017./2020. bez automatskog izračuna, 2023./2024. s rezultatom; postojeći testovi oba modela, više scenarija i Compare reference.
- Segetov sporan nazivnik, Imotskijeva prava nulta stopa, prazna pretraga, nepodržana godina, mrežna pogreška i oporavak.

Snimke su u ignoriranom `frontend/test-results/`. Posebne vizualne snimke povijesnog Explorera napravljene su za širine 1440, 820 i 390 px te osmogodišnji graf. Novigrad/Otok/Privlaka provjereni su podatkovno i API-jem; ne tvrdimo da je za svaki od njih zasebno izveden ručni browser tok.

## 12. Preostala ograničenja i ručna provjera

Potrebno je sadržajno razjasniti istaknute skokove i 11 postojećih spornih nazivnika te potvrditi lokalni kontinuitet granica, usluge i nazivnika. Nije opravdano povezati 2017.–2024. u potvrđen trend ili kontrolni omjer proglasiti službenom stopom. Povijesne materijale treba zasebno metodološki pregledati ako se kasnije požele uvesti. Izvorne licence, URL-ovi i datumi preuzimanja nisu potvrđeni; polja ostaju prazna, bez izmišljenih poveznica. Dokaz potvrđuje prijenos objavljenih tablica, ne istinitost svih izvornih prijava.

Povijesni uvoz uspješno je prošao bez odbačenih redaka tek nakon dokumentiranih PDF korekcija. Nema automatskog popravljanja populacije, zaglađivanja skokova, pretvorbe kontrolnog omjera u službenu stopu ni proširenja Simulatora na starije godine.
