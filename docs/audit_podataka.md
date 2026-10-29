# WasteWise — audit lokalnih podataka 2021.–2024.

Datum audita: 29. listopada 2026. Pregledana je cijela `tehnicka_specifikacija.md` i svih osam izvora u `podaci/`. Izvori nisu mijenjani. Ovo je audit, ne implementacija aplikacije ni potvrda spremnosti podataka za javnu objavu.

## Nalaz za MVP

Postoje stvarni podaci za sva tri obvezna modula: Waste Explorer, Waste Compare i maseni načini Waste Simulatora. Svaka godina ima 556 JLS u glavnoj i materijalnoj tablici. Glavna tablica nema praznih polja, duplikata ključa županija + naziv, negativnih vrijednosti, nepozitivne populacije ni M > T. To ipak ne znači da su sve vrijednosti točne: postoje neskladi pokazatelja i različite revizije izvora.

Najvažnije prepreke: druga skala stope za 2022.; promjena naziva Zagreba; devet spornih populacijskih/pokazateljskih zapisa za 2024.; razlika XLSX/PDF agregata za 2023.; nepotvrđen kontinuitet obuhvata materijala. **Stopa odvojenog sakupljanja nije stopa recikliranja.**

## Postojeći projekt i izvori

Na početku pregleda projekt je sadržavao specifikaciju, direktorij `podaci/`, Git metapodatke i `.DS_Store`. Nema postojećeg backenda, frontenda, baze, migracija ni ETL-a. Specifikacija počinje opisom korisničkog toka i nastavlja se od odjeljka 4; raniji numerirani odjeljci nisu u ovoj datoteci. Zahtjev za FastAPI + PostgreSQL i React + TypeScript prihvaćen je iz zadatka i specifikacije.

Izvori su četiri OOXML `.xlsx` radne knjige i četiri tekstualno čitljiva PDF izvještaja. XLSX ćelije su pročitane iz ZIP/XML strukture, bez otvaranja za pisanje; PDF tekst izvučen lokalnim PDFKit-om. Stranica 94 izvještaja za 2024. dodatno je vizualno provjerena zbog Segeta. Nije provedena ručna usporedba svake PDF ćelije s XLSX-om.

| Godina | XLSX listovi | Glavna tablica | Materijali | ELOO | PDF stranice / revizija na naslovnici |
|---|---:|---:|---:|---:|---|
| 2021. | 2 | 556 | 556 | nema lista | 160 / siječanj 2023. |
| 2022. | 3 | 556 | 556 | 8.525 prijava, 319 ključeva JLS | 154 / listopad 2024. |
| 2023. | 3 | 556 | 556 | 14.116 prijava, 381 ključ JLS | 132 / listopad 2024. |
| 2024. | 3 | 556 | 556 | 18.509 prijava, 404 ključa JLS | 150 / srpanj 2025. |

Točni nazivi datoteka, veličine i SHA-256 nalaze se u `data/manifests/source_files.json`; nazivi listova, izvorna zaglavlja i statistike svih stupaca u `docs/data_audit_details.json`. `.DS_Store` nije podatkovni izvor. Manifest namjerno ostavlja URL, licencu i datum preuzimanja kao null: lokalna prisutnost nije dokaz licence ni datuma preuzimanja. Izdavači su na naslovnicama PDF-a: Ministarstvo gospodarstva i održivog razvoja za 2021.–2022., Ministarstvo zaštite okoliša i zelene tranzicije za 2023.–2024.; izdavač XLSX-a nije neovisno potvrđen.

## Tablice i stupci

**Prilog 1 — glavni pokazatelji**, sve godine, zaglavlje u retku 1, podaci u retcima 2–557; nema ukupnog retka ni višerednog zaglavlja:

| Stupac | Značenje | Tip i jedinica | Napomena za mapiranje |
|---|---|---|---|
| A | Županija sakupljanja | tekst | 2021./2023. prefiksi poput `7. `; 2022./2024. bez njih |
| B | JLS sakupljanja | tekst | Nema službene šifre ni zasebnog tipa grad/općina |
| C | Ukupno sakupljeni komunalni otpad u javnoj usluzi (T) | broj, t | 2021./2022. cijele tone; 2023./2024. do dvije decimale |
| D | Miješani komunalni otpad u javnoj usluzi (M) | broj, t | 2022. zaglavlje izričito navodi obrazac SO-1 |
| E | Stanovnici obuhvaćeni organiziranim sakupljanjem (P) | cjelobrojna vrijednost | Nije automatski ukupno stanovništvo JLS |
| F | Objavljeno kg/stanovnik | broj, kg/stan. | 2021.–2023. cijeli kg; 2024. dvije decimale |
| G | Objavljena stopa odvojenog sakupljanja | broj | 2022. udio 0–1 s Excel formatom `0%`; ostale godine postotna skala 0–100 |

Primjer: Bjelovar 2022. ima G=0,16, Excel numFmtId=9 (`0%`), dakle **16 %**, a ne 0,16 %. Skala se bira eksplicitno po godini, ne heuristikom `vrijednost ≤ 1`, jer ostale godine imaju valjane male postotke. Objavljena preciznost 2022. je cijeli postotak.

Brojevi u XLSX-u imaju numerički tip i decimalnu točku u XML-u, uključujući znanstveni zapis i tragove binarne preciznosti. Nisu hrvatski formatirani tekst koji treba globalno mijenjati zarezom. Budući ETL treba očuvati izvorni zapis i koristiti Decimal/NUMERIC.

**Prilog 2 — materijali**, sve godine, 556 redaka, A županija, B JLS, C papir, D plastika, E staklo, F metal, G glomazni otpad, H tekstil, I biootpad. Sve vrijednosti C:I u XLSX-u su **kg/stan.**, a odgovarajući PDF prilozi navode **tone**. Ne smiju se učitati s istom jedinicom. Primjer 2024., Bjelovar: papir u PDF-u 996,08 t; XLSX 27,856144… kg/stan., uz P=35.758 daje istu masu. To je kontrolni primjer, ne potvrda svakog nazivnika.

U svakoj godini skup ključeva Priloga 2 točno odgovara glavnoj tablici. Svih sedam kategorija postoji sve četiri godine, ali nisu dokazana potpuna razgradnja T−M niti pokazatelj recikliranja. PDF naslov 2021./2022. izričito uključuje spremnike na javnim površinama, 2023./2024. navodi javnu uslugu. Zato materijalni trend 2022.→2023. zasad ima metodološki prekid do potvrde što je promijenjeno. Ne izjednačavati zbroj tih sedam kategorija s ukupnim odvojenim tokom.

**Prilog 3 — ELOO**, samo XLSX 2022.–2024.: A županija, B općina/grad, C naselje, D datum prijave, E zadnje ažuriranje, F status administrativnog postupanja, G datum potvrde, H status lokacije, I status prijave, J X i K Y koordinata HTRS96/TM, L izvor prijave. Datumi su Excel serijski brojevi s vremenom; koordinate su tekst s decimalnim zarezom. U 2022. postoje i formatirane prazne ćelije M:AB bez zaglavlja — nisu dodatni podatkovni stupci.

ELOO ima više redaka po JLS; to nisu duplikati godišnjih opažanja. Nedostaje stabilni ID prijave za sigurno povezivanje snimki. Sadrži prijave iz ranijih godina, pa broj redaka nije broj novih lokacija u godini radne knjige. Ključevi su prebrojeni po nazivima, bez službene identifikacije. Izostanak JLS ne dokazuje odsutnost nepropisno odbačenog otpada. ELOO ne ulazi u osnovni algoritam vršnjaka ni simulator MVP-a.

PDF-ovi dodatno imaju Prilog 3 o tijeku miješanog otpada po JLS (primatelji, odlagališta i mase; više redaka po JLS), a zatim popise odlagališta. PDF Prilog 3 **nije** XLSX Prilog 3 ELOO. Ove detaljne PDF tablice nisu normalizirane ovim auditom i ne daju gotovu lokalnu stopu recikliranja.

## Potpunost i kvaliteta

Prilozi 1 i 2: svih 556 redaka svake godine ima sve očekivane vrijednosti; nema praznina, crtica ili tekstualnih zamjena u numeričkim poljima, Excel pogrešaka ni formula. Vrijednosti su statički objavljene. Provjereni ključevi su jedinstveni unutar lista. Pokrivenost je 556 opaženih naziva, a službena identifikacija i promjene teritorijalnih granica još nisu potvrđene registrom.

| Godina | Nulte stope G | Papir=0 | Plastika=0 | Staklo=0 | Metal=0 | Glomazni=0 | Tekstil=0 | Biootpad=0 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021. | 38 | 51 | 74 | 142 | 250 | 126 | 288 | 341 |
| 2022. | 49 | 40 | 52 | 99 | 206 | 77 | 232 | 317 |
| 2023. | 25 | 52 | 78 | 149 | 213 | 71 | 267 | 311 |
| 2024. | 20 | 45 | 73 | 133 | 198 | 78 | 262 | 286 |

Nule su izričito upisane i čuvaju se kao 0, ne NULL. Ne dokazuju da usluga ne postoji; primjerice stopa 2022. zaokružena na cijeli postotak može biti 0 % i uz malu pozitivnu masu. Nulta frakcija nije dokaz da materijal nije nastao.

ELOO: jedine praznine u smislenim stupcima su datumi potvrde G: 5.200/8.525 (2022.), 10.344/14.116 (2023.), 14.243/18.509 (2024.). Razlog nije kodiran u praznoj ćeliji; ne izmišljati datum niti ga zamijeniti nulom.

| Godina | Raspon T, t | Raspon M, t | Raspon P | Objavljeno kg/stan. | Normalizirana stopa, % |
|---|---|---|---|---|---|
| 2021. | 31–253.524 | 28–173.904 | 171–769.944 | 44–2.054 | 0–80,9 |
| 2022. | 36–231.453 | 27–167.548 | 171–769.944 | 55–2.054 | 0–74 |
| 2023. | 31,97–239.293,50 | 27,34–139.774,50 | 171–769.944 | 47–2.252 | 0–73,7 |
| 2024. | 40,18–252.771,59 | 29,22–139.674,40 | 157–772.122 | 42,99–2.129,71 | 0–74,01 |

Visoke vrijednosti kg/stan. same po sebi nisu dokaz pogreške: turističko opterećenje i nazivnik zahtijevaju kontekst.

### Kontrola objavljenih pokazatelja

Provjerene su formule 1000T/P i 100(T−M)/T nakon normalizacije skale. Za kontrolu je korišten interval zaokruživanja: mase ±0,5 t za 2021./2022., ±0,005 t za 2023./2024.; kg/stan. ±0,5 za 2021.–2023., ±0,005 za 2024.; stopa ±0,05 postotnih bodova za 2021., ±0,5 za 2022., ±0,005 za 2023./2024. P se tretira kao objavljeni cijeli broj. To je eksplicitna pretpostavka audita, ne potvrda izdavačeva pravila zaokruživanja.

Sve stope mogu se uskladiti s odnosom masa unutar tih intervala; maksimalne razlike od izračuna iz samih objavljenih masa iznose približno 1,3226 pb (2021., male zaokružene mase), 1,0920 pb (2022.), 0,0076 pb (2023.) i 0,0087 pb (2024.). Ta aritmetička usklađenost nije sama po sebi potpuna metodološka potvrda simulatora.

Za kg/stanovnik izvan intervala ostaju Virovitica 2021. (364 prema izvedenih 363,472; malo granično odstupanje), Sveta Nedelja u Zagrebačkoj županiji 2022. (320 prema 304,155) te devet JLS 2024.:

| JLS 2024. | XLSX redak | P | Objavljeno kg/stan. | Izvedeno 1000T/P |
|---|---:|---:|---:|---:|
| Đurđenovac | 246 | 10200 | 173.79 | 86.896 |
| Feričanci | 249 | 3292 | 179.42 | 89.708 |
| Seget | 375 | 9330 | 363.99 | 181.996 |
| Biskupija | 396 | 2318 | 145.94 | 72.968 |
| Ivankovo | 469 | 12906 | 167.85 | 83.925 |
| Lovas | 471 | 2904 | 258.77 | 87.059 |
| Dubrava | 528 | 8872 | 157.43 | 78.713 |
| Farkaševac | 531 | 3046 | 133.79 | 66.894 |
| Rakovec | 548 | 2220 | 156.37 | 78.185 |

Kod osam od devet redaka 2024. izvedeni kg/stan. približno je polovica objavljenog; Lovas ima drukčiji omjer. To upućuje na problem nazivnika ili agregiranja, ali uzrok nije potvrđen. Ne dijeliti P automatski s 2 i ne prepisivati objavljeni F. Seget: T=1.698,02 t, P=9.330 i F=363,99 pojavljuju se i vizualno na PDF stranici 94. Potrebno je staviti populaciju i ovisne pokazatelje tih zapisa u pregled; dok se ne razriješe, isključiti ih iz populacijske sličnosti. Mase ne treba automatski odbaciti samo zbog nesklada F.

### Kontrola agregata istog deklariranog obuhvata

| Godina | Zbroj XLSX T, t | PDF T, t | XLSX − PDF T, t | Zbroj XLSX M, t | PDF M, t | XLSX − PDF M, t |
|---|---:|---:|---:|---:|---:|---:|
| 2021. | 1.293.254 | 1.293.256 | −2 | 993.192 | 993.177 | +15 |
| 2022. | 1.270.430 | 1.270.429 | +1 | 965.264 | 965.250 | +14 |
| 2023. | 1.297.200,44 | 1.291.424 | +5.776,44 | 912.261,52 | 912.465 | −203,48 |
| 2024. | 1.352.204,06 | 1.352.204 | +0,06 | 914.640,62 | 914.636 | +4,62 |

PDF kontrolne tablice: 2021. tablica 10, PDF str. 33; 2022. tablica 9, PDF str. 38; 2023. tablica 9, PDF str. 30–31; 2024. tablica 11, PDF str. 37. Stranice su redni brojevi u PDF datoteci.

Razlike 2021./2022. mogu stati u kumulativni učinak zaokruživanja 556 cjelobrojnih masa; to nije dokaz da je uzrok samo zaokruživanje. Za 2023. razlika je mnogo veća od takvog objašnjenja. Za 2024. razlika M od 4,62 t također premašuje 556×0,005 t uz zaokruživanje samog agregata na tonu; traži provjeru revizije/obuhvata. Ne usklađivati lokalne retke proporcionalnim skaliranjem na PDF zbroj. XLSX i PDF držati kao odvojene verzionirane izvore, s otvorenim `source_aggregate_mismatch` problemom. Bez razrješenja ne predstavljati zbroj XLSX-a kao provjerenu službenu nacionalnu vrijednost.

## Povezivanje JLS i usporedivost godina

Nakon uklanjanja brojčanog prefiksa županije, NFC normalizacije, uklanjanja rubnih razmaka i usporedbe bez razlikovanja veličine slova:

| Par godina | Podudaranja naziv + županija | Razlika naziva | Promjene P među neposredno povezanim zapisima | Status |
|---|---:|---|---:|---|
| 2021.→2022. | 556 | nema | 291 | Uvjetno: skala stope i preciznost se mijenjaju |
| 2022.→2023. | 556 | nema | 301 | Uvjetno za glavni list; agregat 2023. sporan; materijalni trend blokiran |
| 2023.→2024. | 555 | Zagreb → Grad Zagreb u županiji Grad Zagreb | 546 od 555 | Uvjetno; alias potvrditi i evidentirati; populacijski problemi 2024. |

Nema drugih nepovezanih ključeva glavnih tablica. Alias Zagreba daje očekivanih 556 kontinuiteta po nazivu, ali nije zamjena za službeni registar i provjeru granica. Ne povezivati samo po nazivu: npr. Sveta Nedelja i Otok postoje u različitim županijama. Službene šifre i tip grad/općina nedostaju u sva četiri XLSX-a. Potrebni su interni stabilni ID-jevi i pregledana tablica aliasa; službena šifra mora imati naveden sustav šifriranja, bez izmišljanja šifre.

PDF opisi 2022.–2024. navode istu definiciju javne usluge i skupine ključnih brojeva (odjeljak 2.4; PDF str. 20, 17, 20); 2021. također opisuje javnu uslugu i njezin obuhvat. To podupire usporedbu glavnog lista, ali ne dokazuje da se svaki lokalni izvještajni obuhvat/granica nije promijenio. Promjena P nije automatski promjena stanovništva ili granice: treba razlikovati prijavljeni obuhvat, ažuriranje populacije i pogrešku. Trendovi po stanovniku moraju prikazati godišnji nazivnik; sporni zapisi ne smiju dobiti neoznačen kontinuitet.

## Posljedice za module

- **Waste Explorer:** koristiti objavljenu stopu uz godišnje mapiranje skale; zasebno izložiti objavljeni i izvedeni kg/obuhvaćenom stanovniku, s oznakom nesklada. T−M zasad označiti kao razliku tokova. Prikazivati izvore i kvalitetu po metrikama, bez pretvaranja problematičnih metrika u 0.
- **Waste Compare:** v1 ima dostupne P i županiju; rezultate otpada ne uključivati u udaljenost. Isključiti zapise s nerazriješenim P iz kandidata i onemogućiti populacijsku usporedbu ako je odabrana JLS takva. v1.1 nije spreman: službeni tip i ukupno stanovništvo nisu dostavljeni. Usporedbe materijala dopuštati samo uz potvrđen zajednički obuhvat i nazivnik; ne obećati neprekinute četverogodišnje trendove.
- **Waste Simulator:** prvo načini A i C računaju promjene masa uz pretpostavke iz specifikacije. Ciljnu stopu B i izračun scenarijske stope držati iza `methodology_verified` uvjeta. Aritmetička provjera je prošla, ali sedam materijala ne dokazuje zatvorenost svih tokova. Potrebno je dokumentirano potvrditi S=T−M i isti nazivnik/obuhvat, po skupu i valjanom retku. Nikakav rezultat ne nazivati recikliranjem.

## Konkretan sljedeći korak implementacije

Implementirati **verzionirani ETL glavnog Priloga 1 za sve četiri godine i prvi provjereni API profil Bjelovara**. Stack ostaje FastAPI + PostgreSQL te React + TypeScript; frontend slijedi nakon provjerenog podatkovnog ugovora.

1. U `pipeline/` napraviti eksplicitne mape listova/stupaca za svaku godinu i normalizaciju G za 2022. U staging spremiti sirovu vrijednost, jedinicu, godinu, list, redak, checksum i verziju parsera. Ne koristiti ovaj auditni float izračun kao produkcijski Decimal ETL.
2. Alembic migracijama u PostgreSQL-u dodati entitete iz specifikacije: municipality, municipality_alias, source_dataset, import_run, waste_observation, quality_issue; držati službene šifre i nepotvrđene metapodatke nullable. Jedinstvenost i aktivna verzija moraju uključivati godinu/obuhvat; ponovljen checksum ne duplicira zapise.
3. Zabilježiti svih 11 nesklada kg/stan. i agregatne probleme; odvojiti dostupnost mase od dostupnosti populacijskih pokazatelja. Pregledati alias Zagreba; za sporne populacije ne nagađati ispravak.
4. Implementirati pretragu JLS, dostupne godine, observations i sources prema `/api/v1` ugovoru. Prvi vertikalni rezultat: pretraga „Bjelovar” → isti interni ID → četiri godine s izvorima, normaliziranom stopom i statusom kvalitete.
5. Provjeriti reprezentativne retke s PDF-om, testirati normalizaciju postotka 2022., alias, očuvanje nula, intervale preciznosti, karantenu i idempotentni uvoz; integracijski pokrenuti migracije i upite na PostgreSQL-u. Zatim izgraditi Explorer u Reactu/TypeScriptu, pa Compare v1 i Simulator A/C.

Početni provjerljivi XLSX primjer za Bjelovar:

| Godina | Redak | T, t | M, t | P | Objavljeno kg/stan. | Objavljena stopa nakon normalizacije, % |
|---|---:|---:|---:|---:|---:|---:|
| 2021. | 163 | 11.054 | 8.180 | 36.433 | 303 | 26 |
| 2022. | 3 | 9.035 | 7.617 | 36.433 | 248 | 16 |
| 2023. | 163 | 9.187,54 | 7.500,45 | 35.813 | 257 | 18,36 |
| 2024. | 3 | 9.773,87 | 6.620,19 | 35.758 | 273,33 | 32,27 |

## Reprodukcija i ograničenja

Pokretanje `python3 pipeline/audit_sources.py` iz korijena projekta čita izvore i ponovno generira `docs/data_audit_details.json` i `data/manifests/source_files.json`. Ne mijenja `podaci/`; koristi samo Python standardnu biblioteku. Prije ponovnog generiranja manifesta usporediti checksumove s prethodnim manifestom ako se želi otkriti zamjena izvora. Ručni PDF nalazi i kontrole agregata dokumentirani su ovdje; nisu automatizirani u toj skripti.

Audit nije neovisna potvrda službenog registra JLS, granica, licence, datuma preuzimanja ni svih metodoloških fusnota. Ne zaključuje da praznina u ELOO znači nultu pojavu ili da lokalno odvajanje znači recikliranje. Izvori su očuvani; implementacija MVP-a još nije pokrenuta.
