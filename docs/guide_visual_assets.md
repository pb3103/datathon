# Waste Guide — vizualna dorada

Vizualna dorada ograničena je na Waste Guide: naslov koristi isti završni raspon veličine kao Home (`clamp(28px, 2.7vw, 40px)`), uvod ima tematsku fotografiju, savjeti imaju slikovne kartice, činjenice izmjenjuju šire slikovne i kompaktnije kartice, a kviz ima zaseban dvostupačni raspored. Na mobitelu se cjeline slažu okomito. Izvori i sve metodološke napomene ostaju dostupni.

Nisu promijenjeni tekstovi edukativnih činjenica, katalog, pitanja ni logika pretrage i kviza. Nema promjena Explorera, Comparea, Simulatora ili početne stranice u ovoj doradi.

## Slike

**Naknadna ispravka ponavljanja:** vodič sada koristi devet različitih slika, svaku samo jednom. Četiri vizuala iz prve dorade ostala su uz tematske savjete; uvod i slikovne činjenice dobili su pet novih motiva. [Nove datoteke i točni promptovi](guide_unique_images.md). Opis četiri slike u nastavku odnosi se na prvotnu seriju.

Četiri ilustrativna prikaza generirana su ugrađenim `image_gen` alatom (imagegen skill, built-in mode), bez CLI/API ključa. Nisu preuzeti iz mentorovih prezentacija i nisu fotografije stvarnih prihvatnih lokacija ili dokaz prihvata materijala. Ne sadrže upute o bojama spremnika.

Lokalne datoteke:

- `frontend/public/images/guide/food.jpg`
- `frontend/public/images/guide/textile.jpg`
- `frontend/public/images/guide/electronics.jpg`
- `frontend/public/images/guide/packaging.jpg`

Originali su generirani kao PNG, a projektne kopije optimizirane su u JPEG, 960 × 640 px, kvalitetom 76. Originali nisu uklonjeni iz direktorija generiranih slika. Fotografije su dekorativne uz postojeći tekst (`alt=""`), s rezerviranim omjerom stranica; fotografije niže na stranici učitavaju se odgođeno.

## Točni promptovi

Svaki od četiri prompta sastavljen je od zajedničkog početka, jedne scene i zajedničkog završetka.

Zajednički početak:

> Use case: photorealistic-natural. Asset type: thematic editorial photograph for WasteWise, a serious Croatian public-data and waste education web application.

Scene:

| Datoteka | Scena |
| --- | --- |
| food.jpg | A reusable clear glass food container with a few fresh carrots and one apple, a folded natural linen napkin, on a warm pale sage tabletop. |
| textile.jpg | A neatly folded sage green cotton shirt and natural beige sweater, a wooden spool of thread and simple repair needle beside them, on a warm ivory tabletop. |
| electronics.jpg | A single unbranded old smartphone with blank dark screen, one coiled charging cable, a small precision screwdriver, and two intact unbranded AA batteries spaced separately, on a pale grey sage tabletop. |
| packaging.jpg | An empty clear glass jar, a plain small kraft cardboard box, one empty unbranded aluminium beverage can and a folded reusable sage fabric shopping bag on a pale ivory tabletop. |

Zajednički završetak:

> Tight overhead editorial still life, objects neatly arranged with generous breathing space. Soft diffused daylight, subtle natural shadows, desaturated forest green, sage, warm cream and restrained muted blue-grey. Premium magazine photography, calm approachable everyday atmosphere, realistic physical objects. Wide landscape 3:2 framing, all meaningful objects within central 80 percent for responsive cropping. No people, no text, no logos, no watermarks, no recycling symbols, no decorative plant leaves, no waste bins. This is an illustrative still life, not a disposal instruction or location photograph.

## Provjere

- Završni cijeli lokalni browser skup: **60/60 prolazi** (52,9 s), uključujući 8 Guide testova i regresije početne, karte, Explorera, Comparea i Simulatora. Poseban Render test `production.spec.ts` nije dio lokalnog stacka i nije izvođen.
- Frontend unit: **8/8 prolazi**.
- Produkcijski build, TypeScript i `npm run format:check`: prolaze.
- Axe provjera Guidea: bez prijavljenih kršenja na 1440, 820, 390 i 320 px. Ispravljen je preslab kontrast malih rednih brojeva u navigaciji; funkcionalne provjere nisu ublažavane.
- Novi test uspoređuje stvarnu izračunatu veličinu glavnog naslova s Homeom na 1440, 820 i 390 px i provjerava učitavanje svih četiriju slika, šest kartica činjenica i svih šest izvora.
- Pregledane su snimke uvoda, prevencije i činjenica na desktopu i mobitelu. Slike ostaju čitljive u promijenjenim omjerima prikaza, sadržaj se slaže u jednu kolonu na uskom zaslonu i nema horizontalnog prelijevanja.
- Četiri JPEG-a ukupno zauzimaju oko 454 KiB; učitavaju se iz projekta. Nema ovisnosti o vanjskom hostingu slika.

Pokretanje:

```sh
docker compose exec -T frontend npm test
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm run format:check
docker compose run --rm --no-deps -v ./frontend/e2e:/app/e2e:ro -v ./frontend/src:/app/src:ro frontend-e2e npm run test:e2e -- --grep-invert 'production serves'
```

Promijenjeni su samo `Guide.tsx`, `guide.css`, novi `GuideVisuals.tsx`, osamljeni novi vizualni browser test unutar `guide.spec.ts`, četiri slike i dokumentacija ove dorade. Ranije izmjene drugih datoteka ostaju iz prethodne implementacije; nisu rezultat ove dorade.
