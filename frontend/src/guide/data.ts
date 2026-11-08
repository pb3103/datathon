export const checkedDate = '2026-11-07';
export const sources = {
  ppwr: {
    title: 'EUR-Lex · Uredba (EU) 2025/40, čl. 71.',
    url: 'https://eur-lex.europa.eu/eli/reg/2025/40/oj',
  },
  packagingEu: {
    title: 'Europska komisija · ambalažni otpad',
    url: 'https://environment.ec.europa.eu/topics/waste-and-recycling/packaging-waste_en',
  },
  foodStudy: {
    title: 'MZOZT · Otpad od hrane u kućanstvima 2025. (PDF, str. 3)',
    url: 'https://isgo-portal.haop.hr/sites/default/files/izvjesca/2026-03/Pregled%20podataka%20o%20otpadu%20od%20hrane%20u%20ku%C4%87anstvima%202025%20-%20ver_5.pdf#page=5',
  },
  paper: {
    title: 'Čistoća Zagreb · papir',
    url: 'https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/papir-23/23',
  },
  glass: {
    title: 'Čistoća Zagreb · staklo',
    url: 'https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/staklo-24/24',
  },
  pack: {
    title: 'Čistoća Zagreb · ambalaža',
    url: 'https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/plasticna-i-metalna-ambalaza/1497',
  },
  bio: {
    title: 'Čistoća Zagreb · biootpad',
    url: 'https://www.cistoca.hr/usluge/odvojeno-skupljanje-otpada/biootpad/1350',
  },
  ee: {
    title: 'gov.hr · električni i elektronički otpad',
    url: 'https://www.gov.hr/hr/elektricni-i-elektronicki-otpad/1328',
  },
  battery: {
    title: 'FZOEU · baterije i akumulatori',
    url: 'https://www.fzoeu.hr/hr/otpadne-baterije-i-akumulatori/7755',
  },
  textile: {
    title: 'FZOEU · posebne kategorije otpada',
    url: 'https://www.fzoeu.hr/hr/ostale-posebne-kategorije-otpada/7759',
  },
  med: {
    title: 'Hrvatska ljekarnička komora · otpadni lijekovi',
    url: 'https://www.hljk.hr/novosti/stop-opasnom-otpadu-u-ljekarnama-n640',
  },
  oil: {
    title: 'Komunalac Samobor · reciklažno dvorište',
    url: 'https://www.komunalac-samobor.hr/komunalac/reciklazno-dvoriste-c337',
  },
  hierarchy: {
    title: 'EUR-Lex · hijerarhija otpada',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=LEGISSUM:waste_hierarchy',
  },
  eu: {
    title: 'Vijeće EU-a · gospodarenje otpadom',
    url: 'https://www.consilium.europa.eu/en/policies/waste/',
  },
  landfill: {
    title: 'Europska komisija · odlaganje otpada',
    url: 'https://environment.ec.europa.eu/topics/waste-and-recycling/landfill-waste_en',
  },
  date: {
    title: 'EFSA · datumi na hrani',
    url: 'https://www.efsa.europa.eu/en/safe2eat/food-date-labelling',
  },
  deposit: {
    title: 'FZOEU · sustav povratne naknade',
    url: 'https://www.fzoeu.hr/hr/otpadna-ambalaza-unutar-sustava-povratne-naknade/9313',
  },
} as const;
export type SourceId = keyof typeof sources;
const groups = {
  paper: {
    category: 'Papir i karton',
    route: 'Odložite u spremnik za papir i karton.',
    preparation: 'Uklonite dijelove od drugih materijala.',
    warning: 'Masni i zaprljani papir ne pripada čistom papiru.',
    map: false,
    local: true,
    source: 'paper',
    receivingType: 'Lokalni odvojeni tok',
    reuse: 'Prije nastanka otpada razmotrite dulju uporabu i izbjegavanje nepotrebne potrošnje.',
    details:
      'Uputa se temelji na lokalnom primjeru; provjerite prihvaćene materijale i način predaje u svojoj zajednici.',
  },
  pack: {
    category: 'Ambalaža',
    route: 'Praznu ambalažu odložite u spremnik koji je za nju predviđen u vašoj zajednici.',
    preparation: 'Ispraznite ambalažu i provjerite oznake.',
    warning:
      'Ovo vrijedi za praznu ambalažu uobičajenih proizvoda. Ambalažu s ostacima boja, kemikalija ili motornih ulja te posude pod tlakom predajte prema posebnim uputama sakupljača.',
    map: false,
    local: true,
    source: 'pack',
    receivingType: 'Lokalni odvojeni tok',
    reuse: 'Prije nastanka otpada razmotrite dulju uporabu i izbjegavanje nepotrebne potrošnje.',
    details:
      'Uputa se temelji na lokalnom primjeru; provjerite prihvaćene materijale i način predaje u svojoj zajednici.',
  },
  glass: {
    category: 'Staklena ambalaža',
    route: 'Odložite u spremnik za staklenu ambalažu.',
    preparation: 'Ispraznite ambalažu.',
    warning: 'Ova uputa ne vrijedi za prozorsko staklo, keramiku ni žarulje.',
    map: false,
    local: true,
    source: 'glass',
    receivingType: 'Lokalni odvojeni tok',
    reuse: 'Prije nastanka otpada razmotrite dulju uporabu i izbjegavanje nepotrebne potrošnje.',
    details:
      'Uputa se temelji na lokalnom primjeru; provjerite prihvaćene materijale i način predaje u svojoj zajednici.',
  },
  bio: {
    category: 'Biootpad',
    route: 'Odložite u spremnik za biootpad.',
    preparation: 'Odvojite ostatke od ambalaže.',
    warning: 'Za kuhanu hranu, meso, ribu i mliječne proizvode provjerite lokalne upute.',
    map: false,
    local: true,
    source: 'bio',
    receivingType: 'Lokalni odvojeni tok',
    reuse: 'Prije nastanka otpada razmotrite dulju uporabu i izbjegavanje nepotrebne potrošnje.',
    details:
      'Uputa se temelji na lokalnom primjeru; provjerite prihvaćene materijale i način predaje u svojoj zajednici.',
  },
  textile: {
    category: 'Tekstil i obuća',
    route:
      'Uporabljive predmete ponudite za ponovnu uporabu; otpadni tekstil i obuću predajte odvojeno.',
    preparation: 'Uporabljive predmete popravite, razmijenite ili darujte.',
    warning:
      'Neuporabljiv tekstil nije za donaciju. Prihvat tekstila i obuće provjerite kod primatelja.',
    map: true,
    local: false,
    source: 'textile',
    receivingType: 'Ponovna uporaba / sakupljanje tekstila',
    reuse: 'Popravak, razmjena ili darivanje uporabljivog predmeta.',
    details: 'Odvojite uporabljive predmete za darivanje od otpadnog tekstila za sakupljanje.',
  },
  ee: {
    category: 'Električni i elektronički otpad',
    route:
      'Ovlašteni sakupljač, odgovarajuće reciklažno dvorište ili prodavatelj prema pravilima preuzimanja.',
    preparation:
      'Predajte cjelovit uređaj. Uporabljiv uređaj sačuvajte za daljnju uporabu ili darivanje.',
    warning: 'Ne rastavljajte uređaj radi izdvajanja materijala. Prihvat provjerite prije dolaska.',
    map: true,
    local: false,
    source: 'ee',
    receivingType: 'Sustav sakupljanja EE otpada',
    reuse: 'Popravak ili predaja uporabljivog uređaja drugom korisniku.',
    details: 'Predaja cjelovitog uređaja omogućuje odgovarajuću obradu EE otpada.',
  },
  battery: {
    category: 'Baterije',
    route: 'Namjensko mjesto za sakupljanje otpadnih baterija.',
    preparation: 'Odvojite baterije od ostalog otpada.',
    warning:
      'Ne odlažite u miješani otpad. Za oštećenu bateriju najprije zatražite uputu sakupljača; nemojte je rastavljati.',
    map: true,
    local: false,
    source: 'battery',
    receivingType: 'Namjensko sakupljanje baterija',
    reuse: 'Za otpadne baterije ova uputa ne preporučuje ponovnu uporabu.',
    details: 'Prijenosne baterije imaju poseban sustav sakupljanja.',
  },
  med: {
    category: 'Otpadni lijekovi',
    route: 'Ljekarna koja preuzima otpadne lijekove iz kućanstva.',
    preparation: 'Prije predaje pitajte ljekarnika za upute.',
    warning: 'Igle i drugi oštri predmeti nisu obuhvaćeni ovom uputom.',
    map: false,
    local: false,
    source: 'med',
    receivingType: 'Ljekarna',
    reuse: 'Za otpadne lijekove pitajte ljekarnika; ova uputa ne preporučuje ponovnu uporabu.',
    details: 'Uputa se odnosi na otpadne lijekove iz kućanstva.',
  },
  oil: {
    category: 'Otpadno jestivo ulje',
    route: 'Odgovarajuće reciklažno dvorište ili organizirano sakupljanje jestivog ulja.',
    preparation: 'Provjerite način pakiranja i uvjete preuzimanja kod sakupljača.',
    warning:
      'Primjer prihvata: reciklažno dvorište u Samoboru. To ne potvrđuje prihvat na svim lokacijama.',
    map: true,
    local: true,
    source: 'oil',
    receivingType: 'Sakupljanje jestivog ulja',
    reuse:
      'Ova uputa odnosi se na predaju otpadnog jestivog ulja, ne na njegovu ponovnu uporabu u prehrani.',
    details: 'Uputa se odnosi na jestivo ulje, ne na motorno ulje.',
  },
} as const;
export interface Item {
  id: string;
  name: string;
  aliases: readonly string[];
  category: string;
  route: string;
  details: string;
  preparation: string;
  reuse: string;
  warning: string;
  local: boolean;
  receivingType: string;
  map: boolean;
  source: SourceId;
  sources: readonly SourceId[];
  checkedDate: string;
}
export const items: readonly Item[] = [
  {
    ...groups.paper,
    ...{ id: 'kutija', name: 'Kartonska kutija', aliases: ['karton', 'paket'] },
    sources: ['paper'],
    checkedDate,
  },
  {
    ...groups.paper,
    ...{ id: 'novine', name: 'Novine', aliases: ['časopis', 'casopisi'] },
    sources: ['paper'],
    checkedDate,
  },
  {
    ...groups.paper,
    ...{ id: 'biljeznica', name: 'Bilježnica', aliases: ['biljeznice', 'školska bilježnica'] },
    sources: ['paper'],
    checkedDate,
  },
  {
    ...groups.paper,
    ...{ id: 'vrecica', name: 'Papirnata vrećica', aliases: ['papirna vrecica'] },
    sources: ['paper'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{ id: 'boca', name: 'Plastična boca', aliases: ['pet', 'boca vode'] },
    warning:
      'Ambalažu pića s oznakom povratne naknade vratite na mjesto za povrat ambalaže. Ostalu praznu ambalažu odložite prema lokalnim uputama. Ambalaža opasnih sadržaja i posude pod tlakom predaju se zasebno.',
    sources: ['pack', 'deposit'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{ id: 'jogurt', name: 'Čašica od jogurta', aliases: ['jogurt', 'čaša jogurta'] },
    sources: ['pack'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{ id: 'limenka', name: 'Limenka', aliases: ['aluminijska limenka'] },
    warning:
      'Ambalažu pića s oznakom povratne naknade vratite na mjesto za povrat ambalaže. Ostalu praznu ambalažu odložite prema lokalnim uputama. Ambalaža opasnih sadržaja i posude pod tlakom predaju se zasebno.',
    sources: ['pack', 'deposit'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{ id: 'konzerva', name: 'Konzerva', aliases: ['metalna ambalaža'] },
    sources: ['pack'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{
      id: 'tetrapak',
      name: 'Višeslojna ambalaža napitaka',
      aliases: ['tetrapak', 'tetra pak', 'karton mlijeka'],
    },
    sources: ['pack'],
    checkedDate,
  },
  {
    ...groups.pack,
    ...{ id: 'folija', name: 'Ambalažna plastična folija', aliases: ['najlon', 'folija'] },
    sources: ['pack'],
    checkedDate,
  },
  {
    ...groups.glass,
    ...{ id: 'staklena-boca', name: 'Staklena boca', aliases: ['boca vina'] },
    warning:
      'Povratna naknada vrijedi za odgovarajuću označenu ambalažu pića. Ostalo prazno ambalažno staklo odvojite prema lokalnim uputama; prozorsko staklo, keramika i žarulje ne pripadaju istom toku.',
    sources: ['glass', 'deposit'],
    checkedDate,
  },
  {
    ...groups.glass,
    ...{ id: 'staklenka', name: 'Staklenka', aliases: ['tegla', 'staklenka pekmeza'] },
    sources: ['glass'],
    checkedDate,
  },
  {
    ...groups.bio,
    ...{ id: 'kore', name: 'Kore voća i povrća', aliases: ['kora banane', 'kore jabuke'] },
    sources: ['bio'],
    checkedDate,
  },
  {
    ...groups.bio,
    ...{ id: 'kava', name: 'Talog kave', aliases: ['kava', 'soc'] },
    sources: ['bio'],
    checkedDate,
  },
  {
    ...groups.bio,
    ...{ id: 'ljuske', name: 'Ljuske jaja', aliases: ['ljuska jajeta', 'ljuske od jaja'] },
    sources: ['bio'],
    checkedDate,
  },
  {
    ...groups.textile,
    ...{ id: 'majica', name: 'Majica', aliases: ['odjeća', 'odjeca', 'stara majica'] },
    sources: ['textile'],
    checkedDate,
  },
  {
    ...groups.textile,
    ...{ id: 'traperice', name: 'Traperice', aliases: ['hlače', 'hlace'] },
    sources: ['textile'],
    checkedDate,
  },
  {
    ...groups.textile,
    ...{ id: 'cipele', name: 'Cipele', aliases: ['obuća', 'obuca', 'tenisice'] },
    sources: ['textile'],
    checkedDate,
  },
  {
    ...groups.textile,
    ...{ id: 'posteljina', name: 'Posteljina', aliases: ['plahta', 'tekstil'] },
    sources: ['textile'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{
      id: 'mobitel',
      name: 'Mobitel',
      aliases: ['telefon', 'smartphone', 'mobilni telefon', 'elektronika', 'EE otpad'],
    },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{ id: 'laptop', name: 'Laptop', aliases: ['računalo', 'racunalo', 'stari laptop'] },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{ id: 'punjac', name: 'Punjač', aliases: ['punjac', 'adapter'] },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{ id: 'kabel', name: 'Kabel', aliases: ['kabl', 'usb kabel'] },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{ id: 'slusalice', name: 'Slušalice', aliases: ['slusalice'] },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{ id: 'kuhalo', name: 'Električno kuhalo', aliases: ['kuhalo vode'] },
    sources: ['ee'],
    checkedDate,
  },
  {
    ...groups.ee,
    ...{
      id: 'stedna-zarulja',
      name: 'Štedna žarulja',
      aliases: ['fluorescentna žarulja', 'zarulja'],
    },
    preparation: 'Predajte cijelu žarulju bez razbijanja; provjerite mjesto preuzimanja.',
    warning:
      'Štedna žarulja nije ambalažno staklo. Uputa ne vrijedi za sve vrste žarulja. Za razbijenu žarulju prije predaje zatražite uputu sakupljača.',
    details:
      'Predviđeno je odvojeno sakupljanje kroz sustav EE otpada, uključujući odgovarajuća prodajna mjesta.',
    reuse: 'Za otpadnu žarulju ova uputa ne preporučuje popravak.',
    sources: ['ee', 'glass'],
    checkedDate,
  },
  {
    ...groups.battery,
    ...{ id: 'baterija', name: 'Prijenosna baterija', aliases: ['aa', 'aaa', 'baterije'] },
    sources: ['battery'],
    checkedDate,
  },
  {
    ...groups.battery,
    ...{ id: 'gumbasta', name: 'Gumbasta baterija', aliases: ['baterija sata'] },
    sources: ['battery'],
    checkedDate,
  },
  {
    ...groups.med,
    ...{
      id: 'lijekovi',
      name: 'Neiskorišteni lijekovi',
      aliases: ['lijek', 'tablete', 'sirup', 'istekli lijekovi', 'stari lijekovi'],
    },
    sources: ['med'],
    checkedDate,
  },
  {
    ...groups.oil,
    ...{
      id: 'ulje',
      name: 'Otpadno jestivo ulje',
      aliases: ['ulje', 'ulje od przenja', 'ulje za kuhanje'],
    },
    sources: ['oil'],
    checkedDate,
  },
  {
    ...groups.paper,
    ...{
      id: 'pizza',
      name: 'Masna kutija od pizze',
      aliases: ['pizza', 'kutija pizze'],
      route: 'Zaprljani karton ne odlažite među čisti papir.',
      preparation: 'Provjerite lokalnu uputu za zaprljanu ambalažu.',
      warning: 'Nije svaki papir pogodan za isti tok sakupljanja.',
    },
    sources: ['paper'],
    checkedDate,
  },
  {
    ...groups.bio,
    ...{
      id: 'ostaci',
      name: 'Ostaci hrane',
      aliases: ['kuhana hrana', 'ostaci rucka'],
      route: 'Mjesto i način predaje ostataka hrane provjerite kod svojeg davatelja usluge.',
      preparation: 'Odvojite hranu od ambalaže.',
      warning: 'Prihvat kuhane hrane, mesa, ribe i mliječnih proizvoda razlikuje se među mjestima.',
    },
    sources: ['bio'],
    checkedDate,
  },
];
