# Provjera rekonstrukcije stope odvojenog sakupljanja

Datum: 31. listopada 2026. Izvedena read-only provjera lokalnih CSV/XLSX/PDF izvora. Ovo je metodološki izvještaj i preporuka prema dopuštenoj alternativi iz zahtjeva; povijesni kontrolni omjeri nisu promovirani u službene stope ili jedinstveni potvrđeni vremenski niz.

## 1. Formula i validacija 2021.–2024.

`r = 100 × (T−M)/T`, T i M u tonama iz istog retka. T mora biti konačan i strogo pozitivan, a M konačan uz `0 ≤ M ≤ T`. Nula/nedostupna ukupna masa ili nevaljana miješana masa daju nedostupnost, nikad zamjensku nulu. Pravi rezultat 0% ostaje nula.

Svaki od 2.224 lokalna retka ponovno je učitan postojećim ETL parserom, uključujući izvornu pretvorbu udjela 2022. u postotke. Izračun koristi Decimal s 40 znamenaka. Objavljene stope nisu mijenjane. Rezultati i pojedinačni zapisi nalaze se u `docs/collection_rate_validation.json`; reprodukcija: `python -m pipeline.audit_collection_rates` u API imageu s izvorima.

| Godina | Uspoređeno | Podudaranja | Nepodudaranja | Prosječno apsolutno odstupanje (pb) | Najveće apsolutno odstupanje (pb) |
|---|---:|---:|---:|---:|---:|---:|
| 2021. | 556 | 556 | 0 | 0.071159 | 1.322581 |
| 2022. | 556 | 556 | 0 | 0.239800 | 1.091954 |
| 2023. | 556 | 556 | 0 | 0.002371 | 0.007594 |
| 2024. | 556 | 556 | 0 | 0.002461 | 0.008652 |

Podudaranje znači preklapanje intervala dopuštenih **preciznošću obje mase i objavljene stope**, a ne da je razlika manja od jedne univerzalne konstante. Koriste se postojeće pretpostavke `year_maps.json`: mase ±0,5 t za 2021./2022., ±0,005 t za 2023./2024.; stope ±0,05 pb, ±0,5 pb, ±0,005 pb i ±0,005 pb redom. Za 2022. tolerancija se odnosi na normalizirane postotke. To nije neovisna potvrda izdavačeva algoritma zaokruživanja.

Granice omjera su `100 × (1−(M+h)/(T−h))` i `100 × (1−(M−h)/(T+h))`, ograničene na 0–100 i proširene preciznošću stope. Ako je T premalen u odnosu na h, kontrola nije potvrđena. U malim JLS s masama objavljenima u cijelim tonama razlika može prelaziti jedan postotni bod bez izlaska iz tih intervala. Stoga nije ispravno primijeniti fiksnih 0,005 pb na sve godine.

### Najveća odstupanja

| Godina | JLS | T (t) | M (t) | Objavljeno (%) | Izračun (%) | Izračun − objavljeno (pb) |
|---|---|---:|---:|---:|---:|---:|
| 2021. | Severin (Bjelovarsko-bilogorska) | 31 | 28 | 11 | 9.677419 | -1.322581 |
| 2021. | Plaški (Karlovačka) | 93 | 88 | 4.7 | 5.376344 | +0.676344 |
| 2022. | Levanjska Varoš (Osječko-baranjska) | 87 | 73 | 15.00 | 16.091954 | +1.091954 |
| 2022. | Drnje (Koprivničko-križevačka) | 169 | 108 | 37.00 | 36.094675 | -0.905325 |
| 2023. | Kalnik (Koprivničko-križevačka) | 110.35 | 75.78 | 31.32 | 31.327594 | +0.007594 |
| 2023. | Ferdinandovac (Koprivničko-križevačka) | 128.85 | 103.02 | 20.04 | 20.046566 | +0.006566 |
| 2024. | Severin (Bjelovarsko-bilogorska) | 42.3 | 32.82 | 22.42 | 22.411348 | -0.008652 |
| 2024. | Zrinski Topolovac (Bjelovarsko-bilogorska) | 59.33 | 47.37 | 20.149999999999999 | 20.158436 | +0.008436 |

Nije pronađeno odstupanje izvan deklariranih intervala. Za prikazane razlike postoji dovoljan aritmetički razlog u preciznosti objavljenih masa/stopa; nije dokazano kako je izdavač zaokruživao ili iz kojih je nezaokruženih vrijednosti računao. Nije izmišljeno lokalno uzročno objašnjenje.

### Berek

Primjer T=124,20 t, M=100,36 t nalazi se u **2024.**, XLSX Prilog 1, redak 2, i PDF Prilog 1. Rezultat je **19,1948470209…%**, a objavljeno je **19,2%**. Primjer prolazi kontrolu preciznosti. To potvrđuje ovaj redak za 2024., a ne definiciju pokazatelja 2017.–2020. Berek 2017. ima druge mase: 136,13 i 135,42 t.

## 2. Što povijesni izvori stvarno potvrđuju

Pregledani su lokalni PDF-ovi, njihovi Prilozi 1, postojeća provjera svih 2.224 povijesna retka, CSV zaglavlja i manifesti. U četiri povijesna CSV-a nema službeno objavljene stope; stupac `izracunata_stopa_odvojeno_pct` jest izvedeni podatak. Nema dodatne lokalne XLSX/CSV tablice s potpunim službenim stopama tih godina. Tekstualne nacionalne stope, popisi JLS iznad praga i karte nisu zamjena za potpunu lokalnu tablicu.

| Godina | Izvor i nalaz | Odluka za sada |
|---|---|---|
| 2017. | PDF Tablica 106, str. 92–101: T, M, P i kg/stan., bez stupca stope. Str. 25 opisuje stope koje ne razmatraju određene složene vrste otpada. | Omjer je aritmetički dostupan; njegova istovjetnost tako definiranoj stopi nije potvrđena. |
| 2018. | PDF Tablica 90, str. 95–104: bez stupca stope. Str. 29 razdvaja složene vrste kod opisa JLS s visokim stopama. Izvješće za 2019., str. 39–40, dodatno navodi primjenu posebne metode od izvještajne 2018. | Ne proglašavati T−M dovoljnim brojnikom za sve povijesne definicije. |
| 2019. | PDF Prilog 1, str. 119–135: T uključuje javnu uslugu i povezanu uslugu; M navodi javnu uslugu SO-1. Str. 39–40 opisuje poseban izračun za poticajnu naknadu. | Nije potvrđen isti obuhvat ulaza ni jednakost užoj stopi; zadržati samo jasno označen kontrolni omjer. |
| 2020. | PDF str. 31 opisuje široki udio svih vrsta osim MKO; Tablica 89, str. 104–113, i T i M navodi u organizaciji JLS. | **Široki udio nemiješanog otpada unutar tog obuhvata jest opravdan izvedeni pokazatelj.** Već je dostupan kao zasebni kontrolni omjer. Nije dokaz ekvivalentnosti užim povijesnim stopama ili potvrđenoj usporedivosti s novijim godinama. |

Posebna formula iz 2019. je `ST = 100 × mOS / (mOS + mMKO)`. Iz mOS i nazivnika isključuje određene vrste, uključujući glomazni otpad, ostatke čišćenja ulica i druge specificirane šifre. Razmatra i prijave reciklažnih dvorišta. Zato **mOS nije automatski T−M**, a nazivnik nije automatski T. Isti izraz „stopa odvojenog sakupljanja” u izvješćima ne znači nužno isti pokazatelj.

U repozitoriju nije pronađena potpuna zasebna lokalna tablica s vrijednostima mOS i isključenih tokova koja bi omogućila rekonstrukciju te uže stope za svih 556 JLS. Novije materijalne kategorije 2021.–2024. ne smiju se koristiti za popunjavanje starijih godina. Nisu preuzimani nepotvrđeni vanjski podaci.

## 3. Odluka o implementaciji i preporuka

**Broj novih stopa u glavnom pokazatelju: 2017. 0; 2018. 0; 2019. 0; 2020. 0.** Koristi se dopuštena opcija izvještaja s preporukom umjesto forsiranja potpunog pokrivanja. Nije potvrđena osnova da se svi stari omjeri prikažu u istoj seriji sa službenim novijim stopama. To ne znači da je aritmetika nevaljana ili da je široki udio 2020. neupotrebljiv: taj je zasebni pokazatelj već dostupan, uz postojeću oznaku kvalitete.

Preporuka za iduće proširenje je zasebna, eksplicitno imenovana serija **„Izračunati udio nemiješanog otpada u organizaciji JLS”** za 2020., s vlastitim obuhvatom i izvornim dokazom, bez preimenovanja u postojeću objavljenu stopu. Za 2017./2018. treba prvo utvrditi uključene tokove, a za 2019. uskladiti obuhvat i pribaviti potrebne isključene kategorije ili stvarnu objavljenu lokalnu tablicu. Ako se pribavi službena lokalna stopa, prednost ima ona, uz vlastitu definiciju.

Aritmetičko podudaranje na svih 2.224 novija retka snažno podupire postojeći model za njih, ali samo po sebi nije metodološki dokaz za starije izvore. Odvojeno sakupljanje nije recikliranje. Širi nemiješani tok nije dokaz obrade ili recikliranja.

## 4. Što je promijenjeno i što ostaje isto

Dodani su reproducibilni read-only audit `pipeline/audit_collection_rates.py`, izvještaj po retku, unit/podatkovni testovi i dokumentacija. Ruff konfiguracija uključuje novi audit. Nisu mijenjani API ugovor, frontend, baze, izvorne mase, objavljene stope, uvoz, njegove oznake kvalitete ili aktivne revizije. ETL idempotentnost i izvorni checksumovi provjeravaju se postojećim regresijskim testovima; novi audit potvrđuje da ne mijenja izvorne datoteke.

Explorer i Compare zadržavaju objavljene stope za 2021.–2024.; povijesne omjere jasno označuju odvojeno. Ne postoji nova izračunata stopa koju bi trebalo prikazati kao službenu ili kojoj bi trebalo mijenjati tooltip/legendu. Nedostupnost nije nula. Simulator ostaje samo 2023./2024., s istim modelima i kontrolama.

## 5. Provedene provjere

- **54 pytest testa prošla**, uključujući 11 novih provjera Bereka, nedostajućih i nevaljanih masa, konačnosti ulaza, prave nule, intervala preciznosti i svih 2.224 novijih redaka. Postojeći PostgreSQL testovi provjeravaju povijesne identitete, ponovljeni uvoz bez duplikata i očuvanje postojećih vrijednosti.
- **Četiri frontend unit testa prošla**, uključujući zaštitu od pretvaranja nedostupnosti u nulu i pravila nepovezivanja nepotvrđenih godina.
- **29 Playwright Chromium testova prošlo** preko stvarnog API-ja: sve godine Explorera i Comparea, povijesne nedostupne službene stope i odvojeni kontrolni omjeri, izvori i lokalna upozorenja, navigacija, mobilna pristupačnost, oba modela Simulatora, dostupnost samo 2023./2024., izvoz i ispis.
- TypeScript, produkcijski build, Prettier, Ruff i `git diff --check` prošli. API image obnovljen je da uključuje novi audit i testove.
- Nisu dodani novi frontend ili API prikazi jer nije aktivirana nova povijesna serija. Ne tvrdi se da je testiran prikaz nove službene/izračunate stope koja nije implementirana.
- Poznato upozorenje o zastarjelom Starlette/AnyIO aliasu ne utječe na rezultat testova.
