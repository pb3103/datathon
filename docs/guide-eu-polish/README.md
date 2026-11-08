# EU ciljevi — ciljani polish

Tri zasebne kartice zamijenjene su zajedničkom vremenskom linijom s oznakom da su to propisani ciljevi država članica, izraženi udjelom mase, a ne ostvareni rezultati. Opis pripreme za ponovnu uporabu i recikliranja prikazan je jednom. Najmanje 55 % (2025.), 60 % (2030.) i 65 % (2035.) ostaju nepromijenjeni.

Odlagališta su zaseban pokazatelj unutar iste cjeline: 2035. najviše 10 %. Metodološka razlika prema stopama odvojenog sakupljanja ostaje vidljiva. Izvori više nisu ponovljeni ispod svake godine.

PPWR je nativni `details/summary` accordion, inicijalno zatvoren, s naslovom i kratkim sažetkom. Otvaranjem ostaju dostupni Uredba (EU) 2025/40, tri područja promjene, pravni kontekst, 11. veljače 2025., 12. kolovoza 2026., zasebni rokovi i oba postojeća izvora.

Promijenjeni su EU blok u `Guide.tsx`, komponenta `PackagingRegulation` u `GuideUpdates.tsx`, lokalni stilovi pod `#ciljevi` i povezane browser provjere u `guide.spec.ts`. Usporedba s početnim arhivom potvrđuje identičan kod zaglavlja i svih ostalih panela te identičnu komponentu `FoodStatistic`. Prethodni CSS ostao je nepromijenjen; dodani selektori ograničeni su na EU panel. Registar izvora, podaci, ostali moduli i navigacija nisu mijenjani. Nema novih fotografija, commita, pusha ili deploymenta.

## Provjere

- Git status pregledan i spremljen; četiri zahvaćene datoteke arhivirane prije izmjene, uključujući tadašnje korisničke izmjene.
- 20/20 Playwright testova prolazi u Chromiumu: svi Guide tabovi, svi predmeti, kviz, izravni URL-ovi i Back/Forward; EU postoci, datumi, metodološka napomena, PPWR otvoreno/zatvoreno i Enter/Space.
- Provjereno je otvaranje sve četiri poveznice EU panela u novoj kartici. Vanjski zahtjevi presreću se u testu: provjera odredišta ne jamči dostupnost tuđih poslužitelja.
- 1440, 768, 390 i 320 px: nema horizontalnog prelijevanja; axe provjere prolaze i uz otvoreni PPWR.
- TypeScript i produkcijski build prolaze. Prethodno upozorenje o veličini Home paketa ostaje.
- Stvarne snimke prije/poslije pregledane su na desktopu i mobitelu. Stvarni mobilni uređaji i Safari/Firefox nisu testirani; javni deployment nije testiran ni mijenjan.

[Prije desktop](previews/before-desktop.png) · [Poslije desktop](previews/after-desktop.png)

[Prije mobitel](previews/before-mobile.png) · [Poslije mobitel](previews/after-mobile.png)

## Vraćanje samo ovog zahvata

Iz korijena projekta:

```sh
python3 docs/guide-eu-polish/restore.py
docker compose exec -T frontend npm run build
```

Skripta provjerava SHA-256 svih zahvaćenih datoteka prije pisanja. Zaustavlja se ako je neka naknadno promijenjena, kako ne bi prebrisala kasniji rad. Vraća samo četiri arhivirane datoteke; ne koristi Git i ne mijenja druge datoteke. Arhiv `before.tar.gz` čuva stanje neposredno prije ovog zahvata.
