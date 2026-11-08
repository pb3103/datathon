# Waste Guide — editorial redizajn, 8. studenoga 2026.

## Promjene

Redizajn je ograničen na Waste Guide. Uvod je kompaktniji, fotografija ima mirniji okvir i potpis, a navigacija između pet sekcija više nije niz jednakih kartica. Naslov zadržava veličinu početne stranice.

Pretraga je glavni bijeli radni prostor sa zelenim naglaskom, većim poljem i jasnim prikazom odabranog predmeta. Upute imaju odvojene oznake za odlaganje, pripremu i upozorenja. Ostaju česti i povezani predmeti, sinonimi, lokalne napomene, URL odabira i poveznice na kartu.

Hijerarhija je interaktivni stepenasti prikaz pet razina. Savjeti kombiniraju šire fotografske cjeline s dvama usporednim člancima. EU ciljevi prikazani su vremenskom linijom, a cilj za odlagališta odvojenom trakom. PPWR i razlika između recikliranja i odvojenog sakupljanja ostaju jasno navedeni.

Činjenice su kraći urednički odlomci s izvorima; podatak o otpadu od hrane istaknut je jednom zelenom cjelinom. Kviz ima traku napretka, izraženiji odabir, različit izgled povratne informacije i jasniji rezultat.

## Datoteke

- `frontend/src/guide/Guide.tsx`: napredak i stanje rezultata kviza, odvajanje cilja odlaganja, dostupna fotografija uvoda.
- `frontend/src/guide/GuideVisuals.tsx`: nove lokalne fotografije, odgovarajući alt tekstovi i dimenzije; prestanak uporabe prethodnih generiranih tematskih slika.
- `frontend/src/guide/guide.css`: svi novi stilovi lokalni su Guideu; prilagodbe za tablet i mobitel.
- `frontend/e2e/guide.spec.ts`: postojeće provjere prilagođene novom broju fotografija i širini 768 px; dodane provjere svih predmeta i dva potpuna prolaza kviza.
- Četiri nove JPEG fotografije u `frontend/public/images/guide/editorial-*`.
- Ovaj direktorij: izvještaj, evidencija fotografija, snimke i sigurno vraćanje.

Usporedba s početnim arhivom potvrđuje da među prethodno postojećim datotekama nisu promijenjene druge datoteke osim navedene tri Guide datoteke i Guide testa. `data.ts`, `content.ts`, `domain.ts`, `GuideSources.tsx` i `GuideUpdates.tsx` ostali su identični. Nisu mijenjani globalni stilovi, navigacija, drugi moduli, backend, ETL ni izvori. Nije napravljen commit, push ili deployment.

## Fotografije i licence

Sve aktivne fotografije su stvarne fotografije, pohranjene lokalno, bez vanjskih zahtjeva pri prikazu. Nema ponavljanja ni aktivnih AI slika. Fotografije ilustriraju teme; ne predstavljaju lokacije na karti ili upute za samostalno rastavljanje uređaja.

| Primjena | Autor | Izvor | Licenca |
|---|---|---|---|
| Uvod, zadržana fotografija razvrstavanja papira | SHVETS production | [Pexels 7512840](https://www.pexels.com/de-de/foto/frau-hand-haus-tisch-7512840/) | [Pexels](https://www.pexels.com/license/) |
| Kupnja voća | Sarah Chai | [Pexels 7267039](https://www.pexels.com/photo/crop-woman-choosing-assorted-healthy-fruits-in-street-market-7267039/) | [Pexels](https://www.pexels.com/license/) |
| Popravak tekstila | Gabriel Frank | [Pexels 11482132](https://www.pexels.com/photo/a-person-sewing-11482132/) | [Pexels](https://www.pexels.com/license/) |
| Popravak elektronike | Albert Vinas | [Unsplash F3t-AzyTbyU](https://unsplash.com/photos/a-person-using-a-cell-phone-to-repair-a-laptop-F3t-AzyTbyU) | [Unsplash](https://unsplash.com/license) |
| Višekratne vrećice | Sarah Chai | [Pexels 7262723](https://www.pexels.com/photo/photo-of-a-person-tying-a-white-bag-7262723/) | [Pexels](https://www.pexels.com/license/) |

Licence provjerene 8. 11. 2026. Obje dopuštaju uporabu na javnoj web-stranici i ne zahtijevaju atribuciju. Autori su svejedno dokumentirani. Ne implicira se njihovo podržavanje WasteWisea. Nove fotografije imaju širinu 960 px, komprimirane su kao JPEG i zajedno zauzimaju približno 454 KiB. Uvodna fotografija ostaje 1200 × 800. Sve osim uvodne učitavaju se odgođeno. `photos.json` sadrži pojedinačne dimenzije, veličine i SHA-256.

## Stvarno izvršene provjere

Prije promjene: 11/11 Guide browser testova, 13/13 frontend testova i TypeScript/produkcijski build prolaze. Snimljen je postojeći izgled na 1440, 768, 390 i 320 px.

Nakon promjene:

- **14/14 Playwright testova Guidea prolazi** u Chromiumu na lokalnom frontendu.
- Svih **32 predmeta** pretraženo je kroz UI; provjereni su naslov, odlaganje, priprema, upozorenje, izvori, lokalna napomena i prisutnost poveznice na kartu.
- Provjereni su sinonimi, nepostojeći pojam, čišćenje, URL odabira i obnova nakon osvježavanja.
- Svih pet sidara i svih pet razina hijerarhije radi. Očuvano je šest činjenica, ciljevi 2025./2030./2035., odvojeni cilj odlaganja, PPWR i statistika s obuhvatom.
- Kviz je prošao s rezultatom **6/6**, **0/6** i mješovitim rezultatom **5/6**; zaključavanje odgovora, izvori objašnjenja, napredak, ponovno pokretanje i tipkovnički odabir rade.
- Poveznica na kartu otvara početnu, pomiče na `#waste-map` i prikazuje Leaflet kartu.
- Fotografije se učitavaju, sve imaju različite putanje; naslov prati veličinu naslova početne.
- **1440, 768, 390 i 320 px:** nema horizontalnog prelijevanja; axe provjera nema prijavljenih povreda. Provjeren je odabir odgovora tipkovnicom.
- Tijekom obilaska svih predmeta nisu zabilježene konzolne pogreške ni `pageerror`.
- **13/13 frontend testova prolazi.**
- **TypeScript i produkcijski build prolaze.** Postojeće Vite upozorenje o Home paketu većem od 500 kB ostaje.
- **Prettier provjera prolazi.**
- Vraćanje je isprobano u izoliranoj kopiji: četiri datoteke uspješno vraćene, četiri nove fotografije uklonjene, a zaštita od naknadnih izmjena zaustavlja ponovno vraćanje.

Naredbe: `docker compose exec -T frontend npm test`, `npm run build`, `npm run format:check`; Playwright kroz `frontend-e2e` s trenutačnim `src` i `e2e` direktorijima montiranima u kontejner.

Vanjske poveznice provjerene su otvaranjem pravilnog URL-a u novoj kartici uz presretanje vanjskih zahtjeva: ovaj test ne dokazuje stalnu dostupnost tuđih poslužitelja. U ovom redizajnu nije ponovno rađen audit činjenica, backend testovi, kompletan testni paket drugih modula ni test javnog deploymenta. Nisu testirani stvarni iOS/Safari/Android uređaji; mobilne provjere izvršene su u Chromiumu s navedenim širinama.

## Vizualna usporedba

Stvarne browser snimke prije i poslije, pregledane tijekom rada:

- [Prije — desktop](previews/before-desktop.png) / [Poslije — desktop](previews/after-desktop.png)
- [Prije — mobitel](previews/before-mobile.png) / [Poslije — mobitel](previews/after-mobile.png)

Dodatne snimke svih sekcija na četiri širine: `/tmp/waste-guide-redesign-20261108/before/` i `after/`. Taj privremeni direktorij može nestati nakon čišćenja sustava; ključne snimke i arhiv prethodnog koda trajno su spremljeni uz ovaj izvještaj.

## Sigurno vraćanje prethodnog Guidea

Početno stanje: grana `main`, HEAD `0828697898be296906582b3e2e49a8a4e14d2e0e`, s postojećim korisničkim izmjenama. Arhiv čuva stvarne datoteke neposredno prije redizajna, a ne stanje HEAD-a. Potpuni početni arhiv dodatno postoji u `/tmp/waste-guide-redesign-20261108/baseline.tar.gz`.

Za vraćanje **samo ovog redizajna**, iz korijena projekta:

```sh
python3 docs/guide-redesign/restore.py
docker compose exec -T frontend npm run build
```

Skripta prvo provjerava SHA-256 svih datoteka koje bi promijenila. Naknadna izmjena ili nedostajuća datoteka zaustavlja postupak prije ikakvog pisanja; tada treba ručno pregledati razlike. Vraćaju se tri Guide datoteke i Guide test iz `before-source.tar.gz`, a uklanjaju samo četiri dodane fotografije čiji sadržaj odgovara manifestu. Izvještaj i snimke ostaju. Ne koristi Git naredbe i ne dira ostale korisničke izmjene. Vraćanje nije izvršeno na radnom projektu.
