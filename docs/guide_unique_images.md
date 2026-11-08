# Waste Guide — slike bez ponavljanja

Uvod i četiri slikovne kartice činjenica dobili su pet novih motiva. Četiri izvorna vizuala ostaju samo uz tematske savjete. Na stranici je devet različitih slika i svaka se koristi jednom. Upute, izvori, raspored i funkcionalnosti nisu mijenjani.

Nove datoteke generirane su ugrađenim `image_gen` alatom (imagegen skill), pregledane i spremljene kao optimizirani JPEG 960 × 640 px. To su ilustrativni prizori, ne službene fotografije prihvatnih lokacija.

## Datoteke i točni promptovi

### `frontend/public/images/guide/hero.jpg`

Use case: photorealistic-natural. Asset type: unique editorial image for WasteWise waste education guide. Close editorial photograph of hands carefully repairing a small tear in a blue-grey denim jacket with needle and thread on a warm ivory worktable. Only hands, no face. A quiet genuine everyday repair scene, not a staged collection of recyclable objects. Premium natural editorial photography, realistic materials, soft diffused daylight, restrained desaturated sage, warm ivory, natural wood and muted blue-grey palette. Wide 3:2 landscape framing with important subjects within central 80 percent, suitable for responsive crops. No text, no watermark, no visible brand names, no recycling symbols, no decorative plant leaves. Illustrative educational scene, not a photograph of a collection location or proof of disposal instructions.

### `frontend/public/images/guide/sorting.jpg`

Use case: photorealistic-natural. Asset type: unique editorial image for WasteWise waste education guide. Overhead editorial photograph of an unbranded empty clear plastic beverage bottle, a softly crumpled sheet of white paper and an empty small metal food tin, neatly separated with space between them on a pale sage tabletop. No glass jars, no cardboard boxes, no shopping bags, no bins. Premium natural editorial photography, realistic materials, soft diffused daylight, restrained desaturated sage, warm ivory, natural wood and muted blue-grey palette. Wide 3:2 landscape framing with important subjects within central 80 percent, suitable for responsive crops. No text, no watermark, no visible brand names, no recycling symbols, no decorative plant leaves. Illustrative educational scene, not a photograph of a collection location or proof of disposal instructions.

### `frontend/public/images/guide/food-dates.jpg`

Use case: photorealistic-natural. Asset type: unique editorial image for WasteWise waste education guide. Editorial close-up of a cut rustic loaf of bread kept in a natural paper bread bag beside two ripe pears on a light cream kitchen counter. No food containers, no carrots, no apples, no text labels. Warm natural texture and everyday food storage. Premium natural editorial photography, realistic materials, soft diffused daylight, restrained desaturated sage, warm ivory, natural wood and muted blue-grey palette. Wide 3:2 landscape framing with important subjects within central 80 percent, suitable for responsive crops. No text, no watermark, no visible brand names, no recycling symbols, no decorative plant leaves. Illustrative educational scene, not a photograph of a collection location or proof of disposal instructions.

### `frontend/public/images/guide/electronics-fact.jpg`

Use case: photorealistic-natural. Asset type: unique editorial image for WasteWise waste education guide. Overhead editorial photograph of an intact old compact computer keyboard and wired computer mouse beside a closed silver portable hard drive on a light blue-grey tabletop. No smartphone, no batteries, no screwdriver, no disassembled equipment, no logos. Premium natural editorial photography, realistic materials, soft diffused daylight, restrained desaturated sage, warm ivory, natural wood and muted blue-grey palette. Wide 3:2 landscape framing with important subjects within central 80 percent, suitable for responsive crops. No text, no watermark, no visible brand names, no recycling symbols, no decorative plant leaves. Illustrative educational scene, not a photograph of a collection location or proof of disposal instructions.

### `frontend/public/images/guide/reuse.jpg`

Use case: photorealistic-natural. Asset type: unique editorial image for WasteWise waste education guide. Editorial photograph of a well-used simple wooden chair beside a small side table with a ceramic mug and an open unmarked book, soft daylight in a calm cream interior. Close crop on the chair seat and table, no people, no clothing, no green shopping bags. Objects kept in everyday use. Premium natural editorial photography, realistic materials, soft diffused daylight, restrained desaturated sage, warm ivory, natural wood and muted blue-grey palette. Wide 3:2 landscape framing with important subjects within central 80 percent, suitable for responsive crops. No text, no watermark, no visible brand names, no recycling symbols, no decorative plant leaves. Illustrative educational scene, not a photograph of a collection location or proof of disposal instructions.

## Provjera

Browser provjera uspoređuje sve `src` adrese na Guideu: očekuje devet slika i devet različitih adresa te provjerava da je svaka uspješno učitana. Izvorni funkcionalni Guide testovi i provjere pristupačnosti ostaju uključeni.


Završni rezultat: svih **8 Guide browser testova prolazi**, uključujući pretragu, kviz, pristupačnost na četiri širine i učitavanje devet jedinstvenih slika. TypeScript, produkcijski build i provjera formatiranja prolaze. Pregledane su i snimke novog rasporeda slika.
