# EU ciljevi i Europski zeleni plan — završno poliranje

## Isporuka

Naslov taba je „Europski ciljevi gospodarenja otpadom”. Iznad vremenske linije sada jasno piše „Koliki dio komunalnog otpada trebamo reciklirati?” te da se radi o minimalnim ciljevima pripreme za ponovnu uporabu i recikliranja, na razini država članica i po masi. Vrijednosti najmanje 55/60/65 % ostaju nepromijenjene, kao i njihova veličina. Vertikalni razmaci linije smanjeni su približno 15–20 %. Pokazatelj odlaganja zasebno ističe ≤ 10 % do 2035., uz izričit nazivnik nastalog komunalnog otpada i razinu države članice. Metodološka napomena skraćena je prema uputi.

Ispod PPWR-a dodan je neovisan accordion Europskog zelenog plana, s istim zaglavljem, kontrolom, obrubom i unutarnjim razmacima. Oba su inicijalno zatvorena i mogu biti otvorena istovremeno. Nativni `details/summary` pruža semantiku proširivanja, stanje i podršku za Enter/Space bez paralelnog, ručno održavanog ARIA stanja.

Novi sadržaj objašnjava strateški okvir iz 2019., klimatsku neutralnost do 2050., kružno gospodarstvo, zdraviji okoliš, praktične korake i odnos s PPWR-om. Jasno je navedeno da odvajanje samo po sebi ne jamči recikliranje i da Zeleni plan nije jedan propis niti sam propisuje sve prikazane ciljeve. Kružno gospodarstvo diskretno je istaknuto.

Sadržaj provjeren 8. 11. 2026. prema službenoj stranici [Vijeća EU-a — Europski zeleni plan](https://www.consilium.europa.eu/en/policies/european-green-deal/). Izvor je dodan u registar i otvara se u novoj kartici uz `noopener noreferrer`. Nove slike nisu preuzimane.

## Opseg

Promijenjene su `Guide.tsx`, `GuideUpdates.tsx` (samo dodana komponenta `GreenDeal`), lokalni CSS, novi zapis u `data.ts` i Guide browser testovi. Postojeći `PackagingRegulation` i `FoodStatistic` ostali su bajtovno identični. Isti je kod zaglavlja i svih ostalih panela; početna stranica, navigacija, drugi moduli, backend, formule i postojeći izvori nisu mijenjani. Jedina vidljiva izmjena zajedničke evidencije izvora je nova službena poveznica.

Git status sačuvan je prije promjena u `git-before.txt`, a pet zahvaćenih datoteka arhivirano je u `before.tar.gz`, uključujući sve tadašnje korisničke izmjene. Nije napravljen commit, push ili deployment.

## Stvarno izvršene provjere

- **21/21 Playwright browser testova prolazi** na stvarnoj lokalnoj aplikaciji u Chromiumu.
- Vremenska linija, svi postoci, odlagališta, metodološka razlika i PPWR datumi/izvori.
- Oba accordiona inicijalno zatvorena; neovisno otvaranje i zatvaranje klikom i Enter/Space; oba istovremeno otvorena.
- Novi sadržaj, tri cilja i četiri praktična koraka, upozorenje o odvojenom sakupljanju i službeni URL s ispravnim atributima.
- Sve vanjske poveznice registra i pet poveznica EU panela otvaraju očekivana odredišta u novoj kartici. Browser test koristi presretanje vanjskih zahtjeva; ne dokazuje stalnu dostupnost tuđih poslužitelja. Novi službeni izvor dodatno je otvoren i pročitan kroz web alat.
- 1440, 768, 390 i 320 px: bez horizontalnog prelijevanja, axe provjere svih panela prolaze i uz oba otvorena accordiona. Nema konzolnih pogrešaka tijekom obilaska panela.
- Ostali tabovi: svih 32 predmeta, svih pet razina hijerarhije, činjenice, šest pitanja kviza i ponovno pokretanje; izravni URL-ovi i Back/Forward prolaze.
- **13/13 frontend testova**, **TypeScript** i **produkcijski build** prolaze. Postojeće Vite upozorenje o veličini Home paketa ostaje.
- Povrat arhiva i zaštita od naknadnih izmjena provjereni su u izoliranoj kopiji.

Nisu testirani stvarni mobilni uređaji, Safari/Firefox, javni deployment ili kompletan backend paket. Mobilni prikazi provjereni su u Chromiumu na navedenim širinama.

## Snimke

[Prije desktop](previews/before-desktop.png) · [Poslije desktop](previews/after-desktop.png)

[Prije mobitel](previews/before-mobile.png) · [Poslije mobitel](previews/after-mobile.png)

[Otvoren Zeleni plan — desktop](previews/green-open-desktop.png) · [mobitel](previews/green-open-mobile.png)

Dodatne snimke svih širina i otvorenog PPWR-a nalaze se u `/tmp/guide-green-deal/`. Pregledani su zatvoreni i otvoreni prikazi na desktopu i mobitelu.

## Vraćanje samo ovih promjena

Iz korijena projekta:

```sh
python3 docs/guide-green-deal/restore.py
docker compose exec -T frontend npm run build
```

Skripta provjerava SHA-256 svih pet zahvaćenih datoteka prije pisanja. Naknadne izmjene je zaustavljaju bez prepisivanja korisničkog rada. Vraća stanje neposredno prije ovog zahvata; ne koristi Git i ne mijenja ostale datoteke. Arhiv i manifest treba sačuvati do završetka pregleda.
