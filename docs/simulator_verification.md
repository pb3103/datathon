# Waste Simulator — implementacija i provjera

Simulator je funkcionalan na `/simulator`, na istom React/TypeScript, FastAPI i PostgreSQL sklopu kao Explorer i Compare. Nema novih vanjskih usluga, ovisnosti ili tablica za scenarije. Izvorne XLSX/PDF datoteke nisu mijenjane.

## Metodološki opseg

Potvrda korisnika nakon pregleda službenih izvješća za 2023./2024. i Excela za 2024. podržava S=T−M i stopu 100S/T za isti obuhvat javne usluge. U lokalnom PDF-u za 2024. provjerene su str. 20 (definicija obuhvata) i 37, Tablica 11 (ukupni, miješani i ostali tokovi). Dokaz i dopuštene revizije zabilježeni su u `data/manifests/simulator_methodology.json`.

Potvrda je namjerno odvojena od globalnog `source_dataset.methodology_verified` i statusa međugodišnje usporedivosti. Ne potvrđuje kontinuitet granica, obuhvata ni nazivnika između godina. Godine 2021./2022. ostaju nedostupne za automatske izračune Simulatora. Nova XLSX revizija zahtijeva novu provjeru i ažuriranje metodološkog manifesta, a ne samo aktivaciju uvoza.

## Provjera stvarnih redaka

Read-only `python -m pipeline.audit_simulator` kontrolira sve retke iz izvornog XML-a XLSX-a i provjerava SHA-256 svih osam izvornih datoteka. Rezultat je `docs/simulator_data_audit.json`.

| Godina | Provjereni retci | Usklađeni i prihvatljivi za maseni model | Isključeni zbog masa/stope | Najveća apsolutna razlika stopa |
|---|---:|---:|---:|---:|
| 2023. | 556 | 556 | 0 | 0,007594019 pp |
| 2024. | 556 | 556 | 0 | 0,008652482 pp |

Primjeri najvećih razlika: Kalnik 2023., objavljeno 31,32 %, iz masa približno 31,327594 %; Severin 2024., objavljeno 22,42 %, iz masa približno 22,411348 %. To su prihvatljive razlike prema zajedničkom intervalu preciznosti masa i stope, a ne prema proizvoljnoj jedinstvenoj toleranciji 0,01 pp.

Za 2023./2024. koriste se mase ±0,005 t, stopa ±0,005 pp i tehnički epsilon 1e−8. Kontrola za T>h računa:

- donja granica G: `100 × (1 − (M+h)/(T−h)) − gh − epsilon`;
- gornja granica G: `100 × (1 − (M−h)/(T+h)) + gh + epsilon`.

Ovo je dokumentirana pretpostavka kontrole objavljene preciznosti (najbliže zaokruživanje), ne neovisna potvrda izdavačeva algoritma zaokruživanja. Provjeru API ponavlja pri svakom zahtjevu. Nevaljan ili neusklađen redak dobiva razloge nedostupnosti i ne računa se. Test namjerno promijenjene stope potvrđuje isključivanje.

Devet zapisa sa spornom populacijom u 2024. ostaje prihvatljivo za izračune masa i stope; njihove izvedene količine po stanovniku su nedostupne. To nije automatsko potvrđivanje ili ispravljanje populacije. Objavljeni kg/stanovniku ostaju zasebno vidljivi u izvornim podacima.

## Modeli i korisničke mogućnosti

- Preusmjeravanje D tona: ukupno ostaje isto, miješano se smanjuje, odvojeni tok raste za D.
- Prevencija D tona početnog miješanog otpada: ukupno i miješano smanjuju se za D, odvojena masa ostaje ista.
- Oba modela prihvaćaju udio početnog miješanog toka, tone ili ciljnu stopu. Za cilj g (%), iznad početne modelske stope, preusmjeravanje zahtijeva `D=gT/100−S`, a prevencija `D=T−100S/g` uz S>0.
- Niži cilj označava se dosegnutim i ne mijenja početno stanje. Prevencija uz S=0 ne može ostvariti pozitivnu stopu. Uz T′=0 stopa je null, ne 0 %. Matematički raspon 0–100 % nije tvrdnja o tehničkoj ostvarivosti.
- Do četiri neovisna scenarija nad istom JLS/godinom/revizijom, uz uklanjanje zadržanih scenarija, usporedni interaktivni graf i tablicu. Tone i kg po obuhvaćenom stanovniku imaju zaseban izbor, stope i promjene u pp odvojen prikaz.
- Referentni cilj iz Comparea provjerava se na serveru: JLS, godina, aktivni zapisi, identitet izvora, checksum, obuhvat, metodološka skupina i stvarna objavljena vrijednost. Parametar cilja iz URL-a nije autoritet. Svaki scenarij nosi vlastitu referencu, pa se može usporediti s vlastitim ciljem.
- Lokalno spremanje, dijeljivi URL, JSON izvoz i provjeren uvoz, CSV i izvještaj za ispis/PDF. Pri uvozu se ignoriraju spremljeni rezultati i računaju novi iz provjerenih parametara. Promjena revizije ne usvaja se tiho.
- API vraća Decimal vrijednosti kao stringove, računa s preciznošću 40. Objavljena i početna modelska stopa ostaju odvojene. Frontend ne duplicira jednadžbe.

## Testovi

- **39 pytest testova prolazi**, uključujući šest novih testova za matematičke modele, rubne slučajeve/invarijante, svih 1.112 stvarnih redaka i izvorne checksumove, PostgreSQL/API kvalitetu i revizije te provjeru referentnog cilja i ulaza. Stvarni redak Janjine dodatno provjerava nultu preostalu masu i nemoguć pozitivan cilj prevencije bez početnog odvojenog toka. Zadržani su svi prethodni podatkovni/backend/API testovi Explorera i Comparea.
- **3 frontend unit testa prolaze.**
- **19 browser testova prolazi** na stvarnom API-ju i PostgreSQL-u: 8 Explorer regresija, 6 Compare regresija i 5 Simulator testova. Obuhvaćeni su oba ciljna modela, do četiri scenarija, već dosegnut cilj, tablica, lokalno spremanje, obnova URL-a, JSON izvoz/uvoz, Compare referenca i manipulirani cilj, nepodržana godina, Segetov sporni nazivnik, nevaljan cilj, Janjinu bez početnog odvojenog toka, prekid veze i ponovni pokušaj bez gubitka unosa, nevaljan spremljeni zapis, mobilni prikaz, desktop/mobilni axe i tablica u ispisnom prikazu.
- TypeScript i produkcijski Vite build prolaze. Prettier i Ruff provjere prolaze. Alembic `check` ne nalazi potrebne dodatne migracije. Ažuriran stvarni HTTP smoke test Explorera prolazi.
- Jedina pytest poruka je postojeće upozorenje o zastarjelom Starlette/AnyIO aliasu. Ugrađeni preglednik sesije nije dostupan; browser provjera provedena je lokalnim Docker/Playwright Chromiumom. Snimke desktop/mobilnog prikaza nalaze se u ignoriranom `frontend/test-results/` i vizualno su pregledane.

## Preostala ograničenja

Nema prognoze učinka mjera, rokova, troškova, emisija, gubitaka obrade ili recikliranih količina. Sedam materijalnih kategorija ne raspodjeljuje se u modelu, ne zbraja i ne pretvara u tone. Populacija je konstantna scenarijska pretpostavka. Scenariji nisu potvrđeni trendovi ili uzročni zaključci.

Upozorenja o razlikama XLSX/PDF agregata za 2023./2024. ostaju vidljiva i dio izvještaja; lokalne mase ne usklađuju se proporcionalnim skaliranjem. Promjena izvještavanja o recikliranim količinama nije pomiješana s modelom odvojenog sakupljanja.

Pohrana je lokalna po pregledniku, bez sinkronizacije računa. Dijeljiva poveznica zahtijeva pristup istoj aplikaciji i pregledanoj reviziji podataka. PDF je preglednikov ispis, bez posebnog poslužiteljskog PDF generatora. Testiran je Chromium; automatizirani axe nije puni ručni audit svih čitača zaslona/preglednika.

Nakon završnog prikaza nezaokružene početne stope, prilagodbe mobilne tablice i dodatne provjere nultog odvojenog toka ponovljen je cijeli Simulator browser skup.
