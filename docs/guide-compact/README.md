# Waste Guide — kompaktni tabovi, 8. 11. 2026.

Ova promjena zamjenjuje prethodni editorial pokušaj. Polazište su manji elementi i struktura izvorne verzije, uz zadržavanje napretka kviza, stvarnih licenciranih fotografija i proširenih provjera.

## Što je promijenjeno

- Uklonjena je velika uvodna fotografija. Uvod ima manji naslov, kratak opis i diskretnu ikonu knjige.
- Pet tabova prikazuje jednu sekciju odjednom: **Gdje ovo baciti? / Smanjite otpad / EU ciljevi / Zanimljivosti / Kviz**. Nema obveznog prolaska kroz sve sekcije na jednoj dugoj stranici.
- Pretraga je vidljiva odmah, i na 320 px. Šest postojećih čestih predmeta prikazano je kao brzi odabir u dva stupca. Rezultati pretrage, povezani predmeti i detaljne upute ostaju dostupni.
- Na desktopu pretraga i detalji koriste dva stupca; na mobitelu prirodno slijede jedan iza drugoga. Prazno stanje detalja je kraće.
- Hijerarhija je kompaktan stepper: poredak 01–05, opis i primjer odabrane razine. Prve dvije razine imaju dodatni naglasak kao poželjniji postupci.
- Četiri teme imaju fotografije visine 96 px na desktopu i sličice 60 × 60 px na mobitelu. Savjeti na mobitelu koriste punu širinu kartice.
- Ciljevi recikliranja su tri manja prikaza u jednom redu; odlagališta su zasebna traka. Ostaju svi izvori, PPWR i metodološka upozorenja.
- Šest činjenica otvara se kroz nativne `details/summary` kontrole. Podatak o otpadu od hrane ostaje vidljiv, s obuhvatom i izvorom.
- Kviz zadržava napredak, zaključavanje odgovora, objašnjenja, rezultat i ponovno pokretanje.

## Navigacija i stanje

Tabovi imaju `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls` i jedan aktivni tab u Tab redoslijedu. Strelice lijevo/desno mijenjaju tab, Home/End otvaraju prvi/posljednji. Enter/Space rade kao na običnim gumbima.

Izravne poveznice ostaju `/guide#odvajanje`, `#prevencija`, `#ciljevi`, `#cinjenice` i `#kviz`, uključujući `?predmet=laptop`. Odabrani tab zapisuje se u povijest preglednika. Back/Forward vraća sekciju i odabir iz URL-a. Pretraga, odabrana razina i započeti kviz ostaju sačuvani pri prebacivanju tabova.

Sadržaj svih pet panela ostaje montiran u DOM-u; neaktivni paneli koriste `hidden`, pa ih čitač zaslona i tipkovnica ne obilaze. Nije dodana serverska predobrada za tražilice: Guide ostaje postojeća React aplikacija. Svaka sekcija ima svoj URL i može se izravno otvoriti.

## Opseg i očuvanje

Promijenjeni su samo:

1. `frontend/src/guide/Guide.tsx`
2. `frontend/src/guide/guide.css`
3. `frontend/e2e/guide.spec.ts`
4. Dokumentacija, arhiv i snimke u ovom direktoriju.

`GuideVisuals.tsx` ostao je jednak verziji prije ovog koraka. Nove fotografije nisu preuzimane. Velika uvodna fotografija više se ne prikazuje, a četiri već licencirane tematske fotografije koriste se u manjem formatu. Autori, izvori i licence ostaju u [evidenciji fotografija](../guide-redesign/photos.json) i [prethodnom izvještaju](../guide-redesign/README.md#fotografije-i-licence).

Bajtovna usporedba potvrđuje da su `data.ts`, `content.ts`, `domain.ts`, `GuideSources.tsx` i `GuideUpdates.tsx` nepromijenjeni u odnosu na početni arhiv. Ostaju svih 32 predmeta, svih šest pitanja s istim točnim odgovorima, činjenice, upute, izvori, lokalne napomene i poveznice na kartu. Nisu mijenjani drugi moduli, zajednička navigacija, globalni stilovi, backend ili baza.

Git stanje pregledano je prije izmjena i spremljeno u `git-before.txt`. Guide još nije imao vlastitu commit povijest; prethodne verzije identificirane su iz sigurnosnih arhiva. HEAD ostaje `0828697`. Nije napravljen commit, push, deployment niti destruktivna Git operacija.

## Izvršene provjere

- **19/19 Playwright testova prolazi** na stvarno otvorenoj lokalnoj aplikaciji u Chromiumu.
- Svih 32 predmeta: pretraga, odabir, naslov, mjesto predaje, priprema, upozorenja, lokalne napomene, izvori i prisutnost poveznice na kartu.
- Sinonimi, nepostojeći pojam, čišćenje pretrage, povezani predmeti i obnova nakon osvježavanja.
- Svih pet tabova i izravnih URL-ova; Back/Forward; čuvanje upisanog pojma, odabrane razine i započetog kviza; tipke strelica, Home i End.
- Svih pet razina hijerarhije, sva objašnjenja i primjeri; sve činjenice i njihovo proširivanje; ciljevi i PPWR datumi/izvori.
- Kviz sa svih šest pitanja: rezultati 6/6, 0/6 i 5/6, povratne informacije, zaključavanje, napredak i ponovni pokušaj; tipkovnički odabir.
- Otvaranje karte na početnoj i prikaz Leafleta; izvori otvaraju ispravna odredišta u novoj kartici.
- **1440 × 900, 768 × 900, 390 × 844 i 320 × 844:** pretraga se nalazi u prvom prikazu, nema horizontalnog prelijevanja. Axe provjera svih pet aktivnih panela, uključujući otvorene činjenice, nema prijavljenih povreda.
- Nema konzolnih pogrešaka ni `pageerror` tijekom obilaska svih panela i predmeta.
- **13/13 frontend testova**, **TypeScript**, **produkcijski build** i **Prettier** prolaze. Ostaje prethodno Vite upozorenje o velikom Home paketu.
- Oba načina vraćanja provjerena su u izoliranim kopijama; zaštita od naknadnih izmjena zaustavlja postupak prije pisanja.

Nisu provjereni stvarni iOS/Android uređaji, Safari/Firefox ili javni deployment. Vanjski URL-ovi u browser testu presreću se radi provjere odredišta, pa test ne dokazuje stalnu dostupnost vanjskih poslužitelja. Backend i kompletan browser paket drugih modula nisu ponovno pokretani u ovom lokalnom Guide zahvatu.

## Vizualna usporedba

Pregledane su stvarne snimke svih pet tabova na četiri širine. Ključne snimke:

- [Nova pretraga — desktop](previews/search-desktop.png) i [mobitel](previews/search-mobile.png)
- [Novi savjeti — desktop](previews/prevention-desktop.png) i [mobitel](previews/prevention-mobile.png)
- [Nove zanimljivosti](previews/facts-desktop.png)
- [Izvorni Guide prije editorial pokušaja — desktop](../guide-redesign/previews/before-desktop.png) i [mobitel](../guide-redesign/previews/before-mobile.png)
- [Prethodni odbijeni pokušaj — desktop](../guide-redesign/previews/after-desktop.png) i [mobitel](../guide-redesign/previews/after-mobile.png)

Dodatne snimke EU ciljeva, kviza i širina 768/320 px nalaze se u `/tmp/guide-compact-20261108/`; ključne snimke iznad trajno su spremljene u projektu.

## Sigurno vraćanje

Za povratak na **izvorni Guide prije neuspjelog editorial pokušaja**:

```sh
python3 docs/guide-compact/restore.py --version original
docker compose exec -T frontend npm run build
```

Za povratak baš na stanje neposredno prije ovog novog kompaktnog zahvata:

```sh
python3 docs/guide-compact/restore.py --version before-compact
docker compose exec -T frontend npm run build
```

Skripta unaprijed provjerava sve SHA-256 vrijednosti. Naknadne izmjene zaustavljaju je bez pisanja. Vraća samo četiri arhivirane datoteke Guidea/testa, ne koristi Git i ne briše slike ili druge datoteke. `original` vraća i tadašnji izbor vizuala; sadašnji mali licencirani vizuali dio su nove kompaktne verzije. Izvorni arhiv je `docs/guide-redesign/before-source.tar.gz`, a stanje prije ovog koraka `docs/guide-compact/before-source.tar.gz`. Nemoj ih brisati dok želiš mogućnost vraćanja.

### Naknadno usklađenje zaglavlja

Na zahtjev korisnice naslov sada koristi istu veličinu, težinu, prored i gornji razmak kao Home. Ikona knjige prikazana je zajedničkim `heading-art` okvirom s dvije kružne linije i točkom, umjesto zasebnog četvrtastog okvira. Natpis je „EKO VODIČ · ODRŽIVOST”, a opis „Naučite kako pravilno odvajati otpad, smanjiti njegov nastanak i svakodnevnim odlukama pridonijeti održivijoj budućnosti.”

Proširena browser provjera uspoređuje font naslova i položaj nadnaslova prema donjem rubu gornje trake s Homeom na 1440, 820 i 390 px. Prolazi; također prolaze preostalih 18 Guide provjera, uključujući prvi prikaz pretrage na četiri širine. TypeScript i build prolaze. [Zaglavlje desktop](previews/header-desktop.png), [zaglavlje mobitel](previews/header-mobile.png). Manifest vraćanja ažuriran je na ovo konačno stanje.
