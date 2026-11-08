# Zanimljivosti — vizualna dorada

Promijenjen je samo prikaz taba Zanimljivosti. Naslov je „Jeste li znali?”, s traženim podnaslovom. Glavni podatak prikazuje veći broj **57,3 kg** u istom retku, odvojenu oznaku „po stanovniku godišnje”, godinu i obuhvat kućanstava. Savjet je diskretno istaknut, a izvor i proširivo objašnjenje istraživanja ostaju pri dnu.

Šest zanimljivosti ima male tematske SVG ikone, oznake kategorija i naslove. Na desktopu su dva neovisna stupca: otvaranje kartice ne rasteže niti pomiče kartice u susjednom stupcu. Na mobitelu je jedan stupac, u istom redoslijedu kao u DOM-u radi dosljedne tipkovničke i čitačke navigacije. Sve kartice inicijalno su zatvorene i koriste nativni `details/summary`, s ugrađenim stanjem proširenosti i podrškom za Enter/Space. Nema novih fotografija.

Vrijednost, referentna godina, definicija, izvor i metodologija statistike ostali su isti. Svi tekstovi šest činjenica, praktični savjeti i poveznice ostaju isti. `content.ts` i `data.ts` nisu mijenjani.

## Datoteke i opseg

Promijenjeni su `Guide.tsx` (samo naslov/prikaz činjenica i njihova izdvojena komponenta), `GuideUpdates.tsx` (samo `FoodStatistic`), `GuideVisuals.tsx` (dodana lokalna komponenta ikona), `guide.css` (dodani stilovi pod `#cinjenice`) i Guide browser testovi. Usporedba s arhivom potvrđuje identičan kod glavnog zaglavlja, svih drugih panela, kviza, PPWR-a i Zelenog plana. Globalni stilovi, drugi moduli i backend nisu dirani.

Git stanje sačuvano je u `git-before.txt`, a pet zahvaćenih datoteka, uključujući prethodne korisničke izmjene, u `before.tar.gz`. Nema commita, pusha ni deploymenta.

## Provjere

- Pokrenut je cijeli Guide Playwright paket: 22 provjere prošle su odmah; nova provjera nepomicanja susjednog stupca prvotno je uspoređivala položaje unutar prozora, pa je registrirala automatsko pomicanje preglednika. Ispravljena je da uspoređuje položaj u dokumentu; obje nove provjere potom prolaze.
- Nakon završne vizualne dorade prolazi **7/7 ciljanih browser testova**, uključujući sve kartice, statistiku, tipkovnicu, nepomicanje susjednih kartica i axe provjere svih panela na **1440, 768, 390 i 320 px**.
- Svih šest kartica otvoreno je tipkom Enter i zatvoreno razmaknicom; provjereni su tekst, praktični savjet i URL izvora. Obuhvat istraživanja otvoren je tipkovnicom i provjereni su uzorak 1.021 kućanstva i isključenje poslovnog sektora.
- Očuvane su početno zatvorene kartice i statistika 57,3 kg, 2025., kućanstva, jestivi i nejestivi dio te postojeći izvor.
- Nema horizontalnog prelijevanja niti prijavljenih axe povreda. Tijekom provjere svih panela nema konzolnih pogrešaka.
- Prolaze **13/13 frontend testova**, **TypeScript** i **produkcijski build**. Prethodno upozorenje o velikom Home paketu ostaje.
- Vraćanje pet datoteka i zaštita od naknadnih izmjena provjereni su u izoliranoj kopiji.

Nisu testirani stvarni iOS/Android uređaji ili Safari/Firefox. Mobilne provjere izvršene su u Chromiumu. Browser provjera vanjskih izvora provjerava ispravno odredište uz presretanje zahtjeva, a ne stalnu dostupnost tuđih poslužitelja. Nije mijenjan ni testiran javni deployment.

## Vizualna usporedba

Pregledane su stvarne snimke na navedenim širinama, sa zatvorenim i otvorenim karticama.

[Prije desktop](previews/before-desktop.png) · [Poslije desktop](previews/after-desktop.png)

[Prije mobitel](previews/before-mobile.png) · [Poslije mobitel](previews/after-mobile.png)

[Otvorena kartica bez rastezanja susjednog stupca](previews/open-desktop.png)

Dodatne snimke svih širina nalaze se u `/tmp/guide-facts-polish/`.

## Sigurno vraćanje samo ovih promjena

Iz korijena projekta:

```sh
python3 docs/guide-facts-polish/restore.py
docker compose exec -T frontend npm run build
```

Skripta provjerava SHA-256 svih pet datoteka prije pisanja. Naknadne izmjene zaustavljaju postupak kako se ne bi prepisao kasniji rad. Vraća samo arhivirane datoteke, ne koristi Git i ne mijenja druge korisničke datoteke. Arhiv i manifest treba sačuvati do završetka pregleda.
