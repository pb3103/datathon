# Provjera spremnosti za Datathon

Datum pregleda: 8. studenoga 2026. Pregled izvornog koda, evidencije izvora i službenih pravila. Nije pravna potvrda ni novi puni funkcionalni test.

## Zaključak

Projekt koristi službene javne statistike, portalne podatke, OpenStreetMap i javne edukativne izvore. Nije potvrđeno da svi korišteni skupovi imaju dokumentiranu dozvolu ponovne uporabe. Nije utvrđena konkretna povreda, ali evidencija još nije dovoljna za bezuvjetnu potvrdu usklađenosti.

## Podaci i prava

- Statistike otpada: javne poveznice i provjera checksumova postoje u data/manifests/source_link_verification.json. Polja licence u source_files.json i historical_sources.json ostaju null. Provjeriti uvjete svake korištene revizije i dopuniti evidenciju. Javna dostupnost sama ne potvrđuje dozvolu redistribucije PDF/XLSX datoteka. Dio izvornika već je praćen Gitom unatoč .gitignore.
- Lokacije s Portala: recycling-locations.json navodi 11 izvornih datoteka i checksumove, ali ne pune katalog URL-ove, izdavatelje i licence. Za zagrebački Geoportal na Portalu potvrđena je Otvorena dozvola. Ostale resurse treba pojedinačno povezati s katalogom i licencom.
- OpenStreetMap: atribucija i poveznica ODbL postoje u Home.tsx i RecyclingMap.tsx; zasebna JSON snimka u frontend/public/data ima ODbL-1.0. Zadržati tu licencu, atribuciju i provjeriti uvjete izvedenih baza pri distribuciji zajedničkog skupa.
- Guide: javni službeni i stručni izvori navedeni su u frontend/src/guide/data.ts. Prezentacije mentora nisu dokaz javne dostupnosti; prema docs/waste_guide_verification.md nisu preuzete slike ni veći odlomci slajdova. Prije javne distribucije prezentacija provjeriti dopuštenje autora. Nisu pronađene među praćenim mentorovim PDF-ovima u ovom pregledu.
- Fotografije: postoje evidencija autora i izvora u docs/guide-redesign/photos.json te Pexels/Unsplash licence. Opći uvjeti dopuštaju web uporabu uz navedena ograničenja. Ne implicirati podršku autora/osoba proizvodu. To nije potpuni neovisni audit svih prava na svakoj fotografiji.
- U pregledanom popisu praćenih datoteka nije pronađena korijenska LICENSE ni objedinjena THIRD_PARTY_NOTICES evidencija. Izbor licence vlastitog koda treba usuglasiti s timom; licenca koda ne mijenja licence podataka i fotografija.
- Nije pronađena jasna objedinjena izjava o korištenju Codexa/AI pomoći pri razvoju. Povijesna evidencija image_gen postoji, ali nije zamjena za popis razvojnih alata.

## Kriteriji ocjenjivanja

| Kriterij | Maksimum | Dokaz i preostali posao |
|---|---:|---|
| Otvoreni podaci | 5 | ETL, izvori, checksumovi; dovršiti licence i katalog resursa. Preuzeti/pripremljeni podaci su dopušteni. |
| Povezivanje izvora | 5 | Godišnje statistike, lokacije Portala i OSM, Guide; u prezentaciji pokazati konkretnu povezanost, ne samo popis izvora. |
| Relevantnost | 5 | Izravna veza s izazovom Okoliš i održivi prostor i gospodarenjem otpadom. |
| Korist zajednici | 5 | Građani i lokalna uprava; opisati stvarne korisničke zadatke. Ne izmišljati izmjeren učinak. |
| Inovativnost/tehnologije | 5 | Objašnjive usporedbe, sljedivi podaci, scenariji; nema dokaza AI/IoT funkcionalnosti u proizvodu. AI pomoć pri razvoju nije AI funkcionalnost aplikacije. |
| Izvedivost | 10 | Funkcionalan prototip i postojeći testovi; završno potvrditi javni demo i reproducibilno pokretanje. |
| Arhitektura/integracija | 5 | FastAPI, PostgreSQL, ETL, REST/OpenAPI, Docker; dopuniti sažetak integracijskih i pravnih preduvjeta. |
| UI/UX | 10 | Moduli, mobilni prikazi, tipkovnica i tablice; ostaje završni pregled aktualne verzije. |
| Prezentacija | 10 | Video do 3 minute obvezan. Video nije pronađen među praćenim datotekama; može postojati izvan repozitorija. |

Ovo nisu dodijeljeni bodovi. Bodove dodjeljuje Povjerenstvo. Maksimum je 60.

## Obvezna predaja i otvorene provjere

Pravila traže kod ili javni repozitorij, tehničku i projektnu dokumentaciju, demo materijale i video do 3 minute. Rješenje bez videa ili predano nakon roka ne ocjenjuje se. Dostava ide na open.data@mpudt.hr. Javni poziv navodi 9. studenoga 2026. do 24:00. Provjeriti eventualne naknadne objave organizatora prije slanja.

Iz repozitorija nije moguće potvrditi valjanost prijave tima, studentski status, mentorstvo, potvrdu primitka prijave, postojanje konačnog videa izvan repozitorija ni prava autora na sve dostavljene materijale.

Pravila potiču napredne tehnologije, ali ih ne postavljaju kao zaseban obvezan uvjet u poglavlju III. Dopuštaju postojeće alate i AI alate uz poštovanje licenci i navođenje u dokumentaciji. Ne treba dodavati izmišljene AI tvrdnje. Za objavu vlastitog koda odabrati odgovarajuću otvorenu licencu uz suglasnost nositelja prava.

## Primarni izvori provjereni preglednikom

- Pravila: https://data.gov.hr/uploads/images/2026-10-19/1792415200857_praviladatathonfinal.pdf
- Javni poziv i rubrika: https://data.gov.hr/uploads/images/2026-10-19/1792415247734_javnipozivdatathonportalaotvorenihpodatakafinal.pdf
- Aktualna objava: https://mpudt.gov.hr/vijesti-8/otvorene-prijave-za-datathon-portala-otvorenih-podataka-nagradni-fond-od-12-000-eura/31145
- Zagrebački skup i Otvorena dozvola: https://data.gov.hr/ckan/en/dataset/reciklazna-dvorista-grada-zagreba1/resource/75dcbefb-8a28-483e-9a3a-e652fa7eae05
- ISGO uvjeti: https://isgo-portal.haop.hr/hr/uvjeti-koristenja (pregledana stranica ne daje jasnu licencu za sve izvještaje)
- OSM: https://www.openstreetmap.org/copyright
- Fotografije: https://www.pexels.com/license/ i https://unsplash.com/license

Nisu mijenjani aplikacija, podaci, licence ni Git povijest u sklopu ove provjere. Nije slana poruka organizatoru niti izvršena predaja.
