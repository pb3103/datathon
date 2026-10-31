# Waste Compare — implementacija i provjera

Datum: 30. listopada 2026. Modul je implementiran u postojećem lokalnom projektu, uz isti FastAPI/PostgreSQL i React/TypeScript/Vite/Recharts stack. Izvorne datoteke nisu mijenjane niti je aplikacija javno objavljena.

## Funkcionalnosti

- Ručni odabir ukupno 2–5 JLS, promjena početne JLS i uklanjanje članova.
- Predloženo do pet potencijalnih vršnjaka prema obuhvaćenoj populaciji. Udaljenost je `abs(ln(P_kandidat) − ln(P_početna))`, izračunata Decimalom s preciznošću 32 i zaokružena na 24 decimale za deterministička izjednačenja. Stabilni UUID razrješava izjednačenja. Količine otpada i stope nisu ulazi u sličnost.
- Omjer 0,5–2 ima prednost; tek kada nema dovoljno kandidata, popunjava se najbližima izvan raspona uz upozorenje. Filtar „ista županija” ostaje na snazi i pri proširenju; nema skrivene težine županije niti automatskog prelaska na drugu godinu.
- Kartice kandidata, objašnjenje metode i omjera, interaktivni graf, alternativna tablica, pregled kroz godine i izvori. Mobilne kartice prijedloga mogu se pregledavati vodoravno, uz pristup tipkovnicom.
- Razlike prema početnoj JLS u tonama, kg/obuhvaćenom stanovniku ili postotnim bodovima. Objavljeni ukupni kg/stan. označeni su zasebno od izvedenih vrijednosti.
- Podaci i kvaliteta provjeravaju se po metrici. Nepotvrđen nazivnik, sporna populacija, neusklađen obuhvat ili nedostajuća godina ne postaju nula. Povijesne metrike prolaze istu backend provjeru kao trenutna usporedba.
- „Gdje su najveće razlike?” koristi najveće relativne raspone `(max−min)/max(abs(min),abs(max))`, s najviše jednim pokazateljem po skupini i do tri uvida. Svaki prikazuje godinu, jedinicu, konkretne JLS i vrijednosti te broj dostupnih JLS. To je opis, ne statistička značajnost, uzročnost ili preporuka. Nema LLM-a.
- URL čuva skupinu, početnu JLS, godinu, filtar, metriku, graf/tablicu i prikaz kroz godine. Refresh i natrag/naprijed reproduciraju odabir.
- „Simuliraj ovaj cilj” prenosi referentnu stopu, JLS, godinu, ID-jeve zapisa i SHA-256 izvora na odredište koje jasno navodi da Simulator nije implementiran. Nema scenarijskog izračuna, obećanja ostvarivosti niti pravnog cilja; buduća implementacija mora ponovno validirati podatke.

## Podaci i metodologija materijala

Migracija `0002` uvodi `material_observation`. `pipeline.materials` učitava svih 556 JLS × 4 godine × 7 kategorija = **15.568 opažanja**, bez odbijenih redaka u postojećim izvorima. Svaki zapis čuva izvorni XML zapis, datoteku, list, redak i dokaz kontrole. Glavni Prilog 1 ostaje nepromijenjen.

Kontrola XLSX jedinice kg/stan. i PDF jedinice t provedena je geometrijskim izdvajanjem riječi iz lokalnih PDF materijalnih tablica, povezivanjem po točnom nazivu i županiji te usporedbom objavljene vrijednosti uz prijavljeni P s PDF masom unutar preciznosti PDF-a (0,005 t i zanemariv ostatak serijalizacije). To je audit nazivnika i jedinice, ne aplikacijska pretvorba materijala u nove tone.

| Godina | Materijalnih opažanja | Nazivnik aritmetički potkrijepljen nenultim retkom | Potpuno nulti retci: nazivnik nije potvrđen |
|---|---:|---:|---:|
| 2021. | 3.892 | 3.633 | 259 |
| 2022. | 3.892 | 3.696 | 196 |
| 2023. | 3.892 | 3.696 | 196 |
| 2024. | 3.892 | 3.724 | 168 |
| Ukupno | 15.568 | 14.749 | 819 |

Svih 15.568 vrijednosti aritmetički je usklađeno s PDF-om. Međutim, potpuno nulti redak ne potvrđuje nazivnik: njegovih sedam vrijednosti ima status `zero_only_denominator_unverified`, ostaje prikazano kao izvorni podatak i ne ulazi u materijalne razlike ili uvide. Nazivnik nulte kategorije može biti potkrijepljen drugim nenultim kategorijama istog retka.

API dodatno zahtijeva da P nije označen spornim, da odgovara kontroliranom P te da je aktivni glavni izvor iste verzije kao materijalni izvor. Aritmetička kontrola ne dokazuje da je prijavljeni P stvarna ili ukupna populacija. Postojećih 11 spornih lokalnih populacijskih zapisa zadržava ograničenja.

Dokazi: `data/manifests/material_verification.json`, s izvornim SHA-256, PDF stranicama i rezultatima po retku i kategoriji. `pipeline/pdf_material_words.swift` i `pipeline.verify_materials` reproduciraju audit postojećih verzija; normalni uvoz koristi njegovu evidentiranu provjeru i provjerava checksumove. Neparsirani ili dvosmisleni retci nikad se ne prihvaćaju fuzzy podudaranjem.

**Preostala metodološka ograničenja:**

- Materijalni naslovi za 2021.–2022. uključuju javnu uslugu i spremnike na javnim površinama; 2023.–2024. navode javnu uslugu. Kontinuitet među godinama nije potvrđen. Zato nema povezivanja, godišnjih materijalnih promjena, zbrajanja kategorija ni izvedenih tona.
- Sve glavne godišnje usporedivosti ostaju `provisional`. Ista deklarirana metodološka skupina nije dokaz jednakog lokalnog obuhvata. Potencijalni vršnjaci nisu potvrđena mjera usporedivosti.
- Službeni tip JLS, ukupna populacija, gustoća i turizam nisu uključeni jer nisu pribavljeni/provjereni. Populacijska sličnost ne dokazuje sličnu strukturu nastajanja otpada ili usluge.
- Upozorenja XLSX/PDF agregata za 2023. i 2024. ostaju vidljiva. Lokalni retci nisu prilagođavani nacionalnom zbroju.
- Stopa odvojenog sakupljanja nije stopa recikliranja. Cilj druge JLS nije preporuka niti zakonska obveza. Simulator još ne radi.

## Provjere

- **33 pytest provjere prolaze** na stvarnom PostgreSQL-u, uključujući postojeći Explorer backend i nove testove materijalnog parsiranja, svih kategorija/jedinica, idempotentnosti, rollbacka i revizija, populacijskog rangiranja, granica 0,5/2, proširenja, filtra županije, neovisnosti od ishoda, razlika, uvida, kvalitete, povijesnog obuhvata i API validacije.
- **3 frontend podatkovne provjere prolaze** za nule/nedostajanje, uvjete povezivanja godina i URL odabir.
- **14 Chromium browser testova prolazi nad produkcijskim buildom**, preko stvarnog API-ja i baze: šest Compare tokova i osam regresijskih Explorer tokova. Namjerno prekidanje zahtjeva ograničeno je na jasno označene testove pogreške.
- Compare browser testovi pokrivaju prijenos iz Explorera, ručni odabir, razlike u postotnim bodovima, godine i URL, pet prijedloga i maksimalnu skupinu, proširenje županijskog raspona, sedam materijala i izvore, Segetova ograničenja, prekid API veze, mobilni prikaz i poveznicu prema pripremi Simulatora.
- Automatizirani axe testovi za desktop/mobilni prikaz prolaze za WCAG 2 A/AA i 2.1 AA pravila u testiranim stanjima. To nije puni ručni audit svih čitača zaslona ili preglednika.
- Nakon završnog dodavanja broja dostupnih JLS u uvidima i oznaka povijesnih nesklada dodatno je provjeren cijeli Compare browser skup.
- TypeScript i produkcijski build prolaze; Prettier provjera prolazi; Alembic `check` ne nalazi razliku modela i sheme.
- Posljednji SHA-256 svih osam originalnih XLSX/PDF datoteka jednak je početnom manifestu.

Ugrađeni preglednik sesije nije dostupan; browser provjera provedena je lokalnim Docker/Playwright Chromiumom. Desktop i mobilne snimke vizualno su pregledane u `frontend/test-results/`. Jedina pytest poruka je postojeća neblokirajuća deprecation poruka iz Starlette/AnyIO testnog klijenta.

Pokretanje, uvoz materijala, obnova tipova, razvojni i produkcijski lokalni pregled te ponavljanje svih provjera opisani su u `README.md`.
