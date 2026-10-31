# WasteWise — povezivanje i završno poliranje proizvoda

Promjene su provedene u četiri faze, uz provjeru sva tri modula nakon svake faze. Opseg je isključivo korisničko sučelje, navigacija, lokalni radni nacrt i prikaz za ispis. Backend, matematički modeli, ETL, službene datoteke i metodološki manifesti nisu mijenjani. SHA-256 usporedba svih 48 zaštićenih datoteka iz tih direktorija prije i nakon rada ne nalazi izmjene.

## Faza 1 — kritični tokovi

- Zajednički helper `frontend/src/navigation.ts` gradi odredišne poveznice iz dopuštenog konteksta JLS-a, godine i usporedne skupine. Parametri referentnog izvora, početnog zapisa, cilja i serijaliziranih scenarija ne kopiraju se u drugi modul. Compare zasebno koristi vlastite filtre.
- Promjena odabira čisti stare scenarijske reference. Usporedna skupina ostaje sačuvana do postojećeg maksimuma od pet JLS-ova, uključujući novu početnu JLS. Otvaranje profila člana iz Comparea također čuva skupinu.
- Simulator dohvaća dostupne godine neovisno o nevaljanoj scenarijskoj poveznici. Pogreška ima akciju za novi scenarij; kod nepoznate JLS nudi se odabir druge zajednice. Nepodržana godina ne ostavlja korisnika bez izlaza.
- Compare više ne tvrdi da je Simulator u pripremi. Nepodržani zapisi nemaju aktivnu simulaciju cilja; prikazuju ograničenje i nude 2024. za ponovnu provjeru dostupnosti. U Simulatoru nedostupni model ima onemogućene kontrole.
- Provjera faze: TypeScript/build, 4 frontend unit testa i 21 browser test prolaze, uključujući nove povratne tokove i oporavak.

## Faza 2 — početna stranica

- `/` je početna stranica WasteWisea; `/explorer`, `/compare` i `/simulator` su zasebni moduli.
- Logo i stavka Početna vode na početnu stranicu. Stare poveznice `/?jls=…` i dalje otvaraju profil na `/explorer`.
- Pretraga iz početne stranice otvara stvarni profil. Tri povezane kartice i slijed Istražite → Usporedite → Simulirajte objašnjavaju vrijednost aplikacije građanima i JLS-ovima.
- Primjer Bjelovar–Samobor 2024. dohvaća objavljene podatke iz postojećeg Comparea i hipotetske mase iz postojećeg API-ja Simulatora. Frontend ne uvodi formule niti ugrađene rezultate. Stvarne vrijednosti odvojene su od hipotetskog izračuna, a ograničenja i napomene o izvorima ostaju navedeni.
- Provjera faze: produkcijski build i 22 browser testa prolaze, uključujući novu početnu pretragu, primjer, stare profilne poveznice i mobilni axe.

## Faza 3 — povezani radni prostor

- Explorer ima kontekstualne akcije za usporedbu i dopušteni Simulator.
- Compare ističe ključne pokazatelje i pristup referentnom cilju prije detaljnih materijalnih uvida; izvorni izračuni i rangiranje uvida nisu mijenjani. Selektor jasno grupira ključne pokazatelje i svih sedam materijalnih kategorija. Prijedlozi imaju proširivi prikaz i objašnjivu sličnost populacije.
- Simulator koristi opise prilagođene preusmjeravanju i prevenciji, novu stopu odvojenog sakupljanja, promjenu u postotnim bodovima, početnu i željenu stopu te rečenicu o promjeni mase i konstantnim veličinama. Poveznica vodi na postojeći graf/tablicu.
- Detaljne formule su proširive. Ključne pretpostavke i ograničenja ostaju vidljivi.
- Zadnji valjani nacrt čuva se u `sessionStorage`, vezan uz JLS/godinu, identitet opažanja, checksum i verziju modela. Automatska obnova nikad ne zamjenjuje API izračun. Eksplicitna druga referenca ili serijalizirana poveznica imaju prednost; nacrt iste referentne poveznice može se obnoviti pri osvježavanju. Vidljiva je oznaka nespremljenih izmjena.
- Provjera faze: TypeScript/build, frontend unit testovi i 23 browser testa prolaze, uključujući obnovu valjanog nespremljenog cilja i modela nakon osvježavanja i povratka kroz Explorer.

## Faza 4 — prezentacija i ispis

- Ujednačeni su prikaz brojeva, oznaka postotnih bodova (pb) i prikaz ulaznih vrijednosti bez nepotrebnih nula. To je prikazno formatiranje; API vrijednosti, formule i izvozni podaci nisu preračunavani.
- Povećani su važni pomoćni tekstovi i mobilna navigacija. Mobilni raspored koristi kompaktnije razmake, lokalno pomicanje tablice i proširive detalje.
- Naslovi kartica odgovaraju modulima. Pri prelasku fokus se postavlja na glavni naslov; nakon korisničke promjene u Simulatoru na naslov odabrane zajednice. Izračun ne preuzima fokus pri svakom unosu.
- Lokalni problemi prikazuju se zasebno i prije općih napomena o izvorima. Sporna populacija odmah je označena uz ključne pokazatelje. Upozorenje za 2023. nije skriveno i ulazi u ispis.
- Poseban `PrintReport` prikazuje početno stanje, scenarije i razlike s jedinicama, parametre i reference, formule, sve API pretpostavke, lokalne probleme i upozorenja izvora. Kontrole i navigacija ne ispisuju se.
- Jedan scenarij Bjelovar–Samobor u provjerenom Chromium/A4 prikazu stane na jednu čitljivu stranicu, bez prazne završne stranice. Provjerava se i izvještaj s četiri scenarija. Vlastite postavke ispisa drugih preglednika mogu promijeniti prijelome.

## Završne provjere

- **39 pytest testova prolazi**, bez promjena postojećih backend/podatkovnih/API testova. Postoji samo prethodno poznato Starlette/AnyIO deprecation upozorenje.
- **4 frontend unit testa prolaze**: nedostajuće vrijednosti, pravila usporedivosti, čisti URL-ovi i očuvanje usporedne skupine.
- **24 browser testa prolaze** na stvarnom FastAPI-ju i PostgreSQL-u: svih 19 postojećih testova uz prilagodbu nove rute/prikaznih oznaka i pet novih testova proizvoda.
- Novi browser slučajevi obuhvaćaju promjenu godine i JLS-a nakon Compare → Simulator, povratak kroz profile članova, očuvanje skupine, nepodržanu i nevaljanu godinu, oštećen zapis scenarija i oporavak, početnu stranicu/pretragu, stvarni i hipotetski primjer, stare poveznice, nespremljeni nacrt, referentni cilj, CSV/JSON, ispis s jednim i četiri scenarija, 320/390 px prikaz i pristupačnost.
- TypeScript, produkcijski Vite build i Prettier prolaze. Nisu uvedene nove ovisnosti ni migracije.
- Desktop i mobilni prikazi te renderirani PDF vizualno su pregledani. Snimke i testni PDF-ovi su privremeni/ignorirani artefakti; nisu dio izvora podataka.
- Ugrađeni preglednik sesije nije dostupan; provjera je provedena lokalnim Docker/Playwright Chromiumom.

## Preostala ograničenja

- Automatski Simulator ostaje ograničen na potvrđeni isti obuhvat javne usluge 2023./2024.; potpuna usporedivost godina nije potvrđena. Odvojeno sakupljanje nije recikliranje, a scenarij nije prognoza ili dokaz ostvarivosti.
- Nacrt je vezan uz istu karticu preglednika i dostupnost sessionStoragea. Za trajno čuvanje postoje lokalno spremanje i izvoz; nema računa ili sinkronizacije. Stari ili nevaljani nacrt ne zaobilazi provjeru izvora.
- Ispis koristi postavke korisnikova preglednika. Automatizirani axe i Chromium provjera nisu puni ručni audit svih čitača zaslona, Safarija ili Firefoxa.
- Nepotvrđeni službeni URL-ovi/licence u postojećim podacima nisu izmišljeni niti mijenjani; trag lokalnog izvora ostaje dostupan.


## Naknadno vizualno poliranje početne stranice

Home sada ima naslov „Podaci koji otkrivaju priču o otpadu.”, vidljiv naziv WasteWise i vizualno povezanu postojeću pretragu. Tri ravnopravne kartice objedinjene su sa sekcijom „Kako funkcionira?”, uz uređene ikone, hover/focus stanja i prilagodbu širini zaslona. Završni dio sažima izvore za 2021.–2024. i hipotetsku prirodu Simulatora.

Veliki prikaz Bjelovar–Samobor iz prethodne faze uklonjen je s Homea, zajedno s automatskim dohvatom njegova primjera. Podaci, API-ji i izračuni u modulima ostaju nepromijenjeni. Bjelovar je zadržan kao kratka akcija postojeće pretrage. Navigacija i rute nisu mijenjane. Zajednički raspored ima opcionalni prikaz zaglavlja koji se koristi samo na Homeu; zadani prikaz ostalih modula ostaje isti. Novi CSS selektori ograničeni su na `.module-home`.

Provjere: 25 browser testova i 4 frontend unit testa prolaze; TypeScript, produkcijski build i Prettier prolaze. Snimke desktopa (1440 px), tableta (820 px) i mobitela (390 px) vizualno su pregledane. Prolaze axe provjere, pretraga tipkovnicom, sve poveznice kartica i postojeće regresije Explorera, Comparea i Simulatora. Novi test potvrđuje da Home prije korisničke akcije ne šalje API zahtjeve za podatke. Hash usporedba ostalih modula, pretrage, API-ja, modela, ETL-a, podataka i manifesta ne nalazi promjene.


## Dorada prikaza kvalitete i podrijetla — 31. listopada 2026.

Prema novom zahtjevu korisnice uklonjen je korisnički prikaz općih razlika agregata XLSX/PDF (2023./2024.), uključujući sažeti ispis. Sirovi API problemi, validacije i interna evidencija ostaju nepromijenjeni; prethodni navodi o obvezno vidljivim karticama opisuju raniju verziju proizvoda. Četiri povijesne napomene spojene su u jednu neutralnu zelenu karticu s `Saznaj više` i poveznicama prema godišnjim detaljima izvora. Lokalna ograničenja zadržana su.

Ujednačeni su samo prikazni nazivi glavnih CSV/XLSX izvora; fizički nazivi, izvorne putanje, PDF-ovi i manifesti nisu mijenjani. Izvorna putanja ostaje u detaljima. Nisu mijenjani modeli, API, podaci ni ETL. Prikazna funkcija filtrira isključivo `source_aggregate_mismatch`, bez brisanja problema iz odgovora API-ja.


Provjere ove dorade: 43 pytest testa, četiri frontend unit testa, TypeScript, produkcijski build i Prettier prošli. Svih 29 Playwright browser testova prošlo je preko stvarnog API-ja (uključujući novi test jedne napomene, tipkovničkog proširivanja, četiri izvora, osam prikaznih naziva, odsutnosti općih kartica, mobilnog prelamanja i axe pristupačnosti). Postojeći testovi izmijenjeni su samo u očekivanju uklonjenih općih napomena; lokalne kvalitativne provjere ostaju. Mobilni test otkrio je prelijevanje dugog PDF hasha u otvorenim detaljima, riješeno prelamanjem teksta. Ponovljeni cjeloviti live API audit vratio je identičan rezultat prethodnoj evidenciji: 4.448 opažanja i 26.736 ćelija metrika. Simulator, navigacija, izvoz i ispis prošli su regresijske tokove. Fizički nazivi nisu mijenjani pa ETL reference i identiteti izvora ne zahtijevaju migraciju.
