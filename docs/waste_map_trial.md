# Waste Map — probno izdvajanje karte

Polazište: `31237f3a1b2867bc34cd65dcf7ccc37c418a91be` (spremljeno i objavljeno prije ove promjene).

Karta je premještena s početne na `/map`. Zadržani su postojeći `AreaSearch`, `RecyclingMap`, podaci, filtri, popis i izvori. Početna ima pet jednakih kartica modula, uključujući Waste Map i planirani Waste Guide; sva tri opisa izvora ostaju i na početnoj. Prema naknadnoj uputi dodana je prazna stranica `/guide` s oznakom da je sadržaj u pripremi; nema vodiča ni kviza.

Promijenjene postojeće datoteke:
- `README.md`
- `frontend/src/App.tsx`
- `frontend/src/Home.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Icon.tsx`
- `frontend/src/styles.css`
- `frontend/e2e/product.spec.ts`
- `frontend/e2e/recycling.spec.ts`

Nove datoteke: `frontend/src/WasteMap.tsx` i ovaj dokument.

Ako korisnica odbije probu, vratiti samo gore navedene postojeće datoteke na polazišni commit i ukloniti dvije nove datoteke, zatim ponoviti frontend build. Prije povrata provjeriti jesu li nakon probe nastale dodatne izmjene koje treba sačuvati. Ne koristiti opći `reset --hard`; ranije dorade ostaju sačuvane u polazišnom commitu.

Provjere: produkcijski build i TypeScript; postojeći tok karte (pretraga, vrste, izvori, popis, poveznica na Explorer); početna bez interaktivne karte; nova ruta, aktivna navigacija, izvori i pristupačnost pri širinama 1440, 820 i 390 px.

Rezultat provjere: TypeScript i produkcijski build prolaze; svih 44 browser testa prolazi (uključujući regresije Explorera, Comparea i Simulatora). Snimke početne i karte provjerene su na desktopu, tabletu i mobitelu. Promjene nisu commitane ni pushane.

Naknadna dorada: Map je odmah ispod Početne u navigaciji, Guide zadnji. Dodana je ikona knjige. Izvori karte su i dalje dostupni i na samoj karti.

## Završetak probe — povrat karte na početnu

Korisnica je zatražila povrat interaktivne karte na početnu, uklanjanje Waste Map navigacije i zadržavanje praznog Waste Guidea. Home, pretraga, karta i izvori vraćeni su iz polazišta `31237f3`, uz novu četvrtu Guide karticu. Na desktopu su četiri kartice u jednom redu; na manjim ekranima ostaje responzivan raspored. Uklonjene su aktivne točkice iz navigacije.

Prije povrata napravljena je provjerena kopija svih 10 tada izmijenjenih/novih datoteka i patcha u `/tmp/wastewise-before-map-return-20261105.zip`. Modul probne karte je dodatno premješten u `/tmp/wastewise-map-trial-module-20261105.tsx`. Nema promjena podataka ni modela. Stari opis probe iznad ostaje zapis provedenog eksperimenta, a ne opis aktualnog sučelja.
