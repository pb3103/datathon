import type { SourceId } from './data';
export const hierarchy = [
  [
    'Sprječavanje nastanka otpada',
    'Spriječiti da proizvod ili materijal uopće postane otpad.',
    'Prije kupnje provjerite što već imate i kupite samo potrebnu količinu.',
  ],
  [
    'Priprema za ponovnu uporabu',
    'Provjera, čišćenje ili popravak predmeta koji je već postao otpad. Darivanje uporabljivog proizvoda koji nije postao otpad jest ponovna uporaba, a ne ovaj postupak.',
    'Centar provjerava i popravlja odbačeni stolac kako bi se ponovno koristio.',
  ],
  [
    'Recikliranje',
    'Prerada otpadnih materijala u nove proizvode ili materijale.',
    'Odvojeno sakupljena staklena ambalaža može postati sirovina za novo staklo.',
  ],
  [
    'Ostali postupci oporabe',
    'Iskorištavanje otpada na druge načine, uključujući energetsku oporabu.',
    'Otpad se može koristiti za dobivanje energije u odgovarajućem postrojenju.',
  ],
  [
    'Zbrinjavanje',
    'Zbrinjavanje uključuje postupke poput odlaganja otpada. U hijerarhiji je iza postupaka oporabe.',
    'Odlaganje na uređeno odlagalište.',
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
