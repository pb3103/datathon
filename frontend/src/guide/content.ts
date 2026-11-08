import type { SourceId } from './data';
export const hierarchy = [
  [
    'Sprječavanje nastanka otpada',
    'Sprječavanje znači da proizvod ili materijal uopće ne postane otpad. To postižemo promišljenom kupnjom, pravilnim čuvanjem i duljim korištenjem stvari koje već imamo. Ova razina ima prednost jer smanjuje potrebu za obradom otpada i potrošnju novih resursa.',
    'Prije kupnje hrane provjerite hladnjak i napravite popis potrebnih namirnica. Kupite količinu koju možete potrošiti, a višak zamrznite kako se hrana ne bi pokvarila i završila u otpadu.',
  ],
  [
    'Priprema za ponovnu uporabu',
    'Predmet koji je već odbačen pregledava se, čisti ili popravlja kako bi se mogao ponovno koristiti za istu namjenu. Time se uporabljivim predmetima produljuje život. Darivanje predmeta koji još nije postao otpad jest ponovna uporaba, bez prethodne obrade otpada.',
    'Centar preuzima odbačeni stolac, provjerava njegovu sigurnost i popravlja oštećene dijelove. Nakon čišćenja i provjere stolac je ponovno spreman za uporabu, umjesto da završi na odlagalištu.',
  ],
  [
    'Recikliranje',
    'Recikliranje je prerada otpadnih materijala u nove proizvode ili materijale. Otpad se prikuplja, razvrstava i obrađuje kako bi ponovno postao korisna sirovina. Pravilno odvajanje olakšava taj postupak, ali samo odvojeno sakupljanje još ne znači da je otpad recikliran.',
    'Odvojeno sakupljene staklenke i boce razvrstavaju se, čiste i usitnjavaju. Dobiveno staklo zatim se tali i koristi kao sirovina za izradu nove staklene ambalaže, čime zamjenjuje dio novih sirovina.',
  ],
  [
    'Ostali postupci oporabe',
    'Otpad se iskorištava za korisnu svrhu, primjerice za dobivanje topline ili električne energije. Za razliku od recikliranja, pritom se ne prerađuje u novi proizvod ili materijal. U hijerarhiji otpada ovi postupci dolaze nakon ponovne uporabe i recikliranja.',
    'Otpad prikladan za energetsku oporabu koristi se kao gorivo u za to predviđenom postrojenju. Dobivena toplina služi za grijanje ili proizvodnju električne energije, uz propisani nadzor emisija.',
  ],
  [
    'Zbrinjavanje',
    'Zbrinjavanje obuhvaća postupke poput odlaganja otpada, pri kojima se otpad ne iskorištava za korisnu svrhu. To je posljednja razina u hijerarhiji otpada. Prednost imaju sprječavanje nastanka, ponovna uporaba, recikliranje i drugi postupci oporabe jer bolje čuvaju vrijednost materijala.',
    'Preostali otpad odlaže se na uređeno odlagalište uz propisane mjere zaštite tla, vode i zraka. Materijali se time ne vraćaju u uporabu, pa je cilj smanjiti odložene količine.',
  ],
] as const;
export const topics = [
  {
    title: 'Hrana',
    tips: [
      'Planirajte kupnju prema onome što već imate.',
      'Kupujte uz popis; zamrznite višak u porcijama.',
      'Razlikujte oznake rokova i slijedite uvjete čuvanja.',
    ],
    item: 'kore',
    source: 'date',
  },
  {
    title: 'Tekstil',
    tips: [
      'Popravite odjeću prije zamjene.',
      'Razmijenite ili darujte uporabljivu odjeću.',
      'Neuporabljiv tekstil predajte odvojeno.',
    ],
    item: 'majica',
    source: 'textile',
  },
  {
    title: 'Elektronika i baterije',
    tips: [
      'Prije zamjene provjerite mogućnost popravka.',
      'Uporabljiv uređaj ponudite drugome.',
      'Otpadne uređaje i baterije predajte namjenskim sakupljačima.',
    ],
    item: 'mobitel',
    source: 'ee',
  },
  {
    title: 'Plastika i ambalaža',
    tips: [
      'Birajte višekratnu ambalažu kad možete.',
      'Izbjegnite nepotrebno pakiranje.',
      'Ispraznite ambalažu i pratite lokalne upute.',
    ],
    item: 'boca',
    source: 'pack',
  },
] satisfies { title: string; tips: string[]; item: string; source: SourceId }[];
export const facts = [
  [
    'Odvojeno sakupljanje nije recikliranje',
    'Odvojeno sakupljeni otpad tek ulazi u daljnje postupke obrade.',
    'Stopu odvojenog sakupljanja čitajte odvojeno od pokazatelja recikliranja.',
    'eu',
  ],
  [
    'Datumi na hrani imaju različito značenje',
    '„Upotrijebiti do” odnosi se na sigurnost, a „najbolje upotrijebiti do” na kvalitetu.',
    'Poštujte rok „upotrijebiti do” i upute za čuvanje.',
    'date',
  ],
  [
    'Staklo nije uvijek ambalažno staklo',
    'Prozorsko staklo i žarulje ne pripadaju spremniku za boce i staklenke.',
    'Provjerite vrstu stakla prije odlaganja.',
    'glass',
  ],
  [
    'Elektronika sadrži korisne sirovine',
    'Elektronički otpad može sadržavati vrijedne materijale, ali i opasne sastojke.',
    'Predajte cjelovit uređaj kroz namjenski sustav.',
    'eu',
  ],
  [
    'Baterije se sakupljaju zasebno',
    'Namjensko sakupljanje omogućuje odgovarajuću obradu baterija.',
    'Pronađite mjesto za preuzimanje otpadnih baterija.',
    'battery',
  ],
  [
    'Ponovna uporaba dolazi prije recikliranja',
    'Hijerarhija prednost daje sprječavanju otpada i pripremi za ponovnu uporabu.',
    'Prije bacanja provjerite može li se predmet popraviti.',
    'hierarchy',
  ],
] satisfies [string, string, string, SourceId][];
export const questions = [
  {
    text: 'Koji postupak ima prednost u hijerarhiji otpada?',
    options: ['Sprječavanje nastanka otpada', 'Recikliranje', 'Odlaganje'],
    correct: 0,
    explanation: 'Najprije pokušavamo spriječiti nastanak otpada.',
    source: 'hierarchy',
  },
  {
    text: 'Što znači stopa odvojenog sakupljanja?',
    options: [
      'Udio otpada koji je sigurno recikliran',
      'Udio odvojeno sakupljenog otpada',
      'Udio otpada koji nije nastao',
    ],
    correct: 1,
    explanation: 'Odvojeno sakupljanje nije dokaz da je sav taj otpad recikliran.',
    source: 'eu',
  },
  {
    text: 'Kamo s neuporabljivim mobitelom?',
    options: ['U ambalažno staklo', 'U miješani otpad', 'U odgovarajući sustav za EE otpad'],
    correct: 2,
    explanation: 'Električni i elektronički otpad predaje se zasebno kroz odgovarajući sustav.',
    source: 'ee',
  },
  {
    text: 'Može li žarulja u spremnik za staklene boce?',
    options: [
      'Da, svako staklo ide zajedno',
      'Ne, potrebno je provjeriti sustav za tu vrstu žarulje',
      'Da, ako je razbijena',
    ],
    correct: 1,
    explanation: 'Ambalažno staklo ne uključuje žarulje.',
    source: 'glass',
  },
  {
    text: 'Na što se odnosi cilj EU-a od 65 % za 2035.?',
    options: [
      'Pripremu za ponovnu uporabu i recikliranje komunalnog otpada po masi',
      'Samo odvojeno sakupljanje',
      'Sav nastali otpad u svakom gradu',
    ],
    correct: 0,
    explanation:
      'Riječ je o cilju za države članice, a ne o stopi odvojenog sakupljanja pojedine JLS.',
    source: 'eu',
  },
  {
    text: 'Što označava „upotrijebiti do” na hrani?',
    options: [
      'Samo izgled ambalaže',
      'Samo kvalitetu',
      'Sigurnosni rok uz propisane uvjete čuvanja',
    ],
    correct: 2,
    explanation: '„Upotrijebiti do” odnosi se na sigurnost hrane; slijedite rok i uvjete čuvanja.',
    source: 'date',
  },
] satisfies {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  source: SourceId;
}[];

export const foodStatistic = {
  value: '57,3',
  unit: 'kg po stanovniku godišnje',
  referenceYear: 2025,
  publicationYear: 2026,
  source: 'foodStudy' as const,
  scope:
    'Procjena otpada od hrane iz kućanstava u Hrvatskoj za 2025., uključujući jestivi i nejestivi dio.',
  methodology:
    'Nacionalni uzorak od 1.021 kućanstva, anketa i sedmodnevni dnevnik uz vaganje. Ne uključuje poslovni sektor ni hranu izdvojenu za životinje.',
  tip: 'Planirajte kupnju i pravilno čuvajte namirnice kako biste smanjili bacanje hrane.',
};
