import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/transactions/templates/templates.js';

export function defineAccountTemplates() {
// Kettős könyvelés verzió

  Templates.define({ _id: 'Condominium_COA', accounts: [
    { code: '`', name: 'Chart of Accounts', category: 'technical', locked: true },
//  { code: '`0', name: 'Opening' },// TECHNIKAI SZÁMLÁK
    // 1
    { code: '`1', name: 'BEFEKTETETT ESZKÖZÖK', category: 'asset', locked: true, sign: +1 },
    { code: '`13', name: 'MŰSZAKI BERENDEZÉSEK', category: 'asset' },
    { code: '`14', name: 'EGYÉB BERENDEZÉSEK', category: 'asset' },
    { code: '`16', name: 'BERUHÁZÁSOK', category: 'asset' },
    { code: '`18', name: 'HITELVISZONYT MEGTESTESÍTŐ ÉRTÉKPAPÍROK', category: 'asset' },
    // 2
    { code: '`2', name: 'KÉSZLETEK', category: 'asset', locked: true, sign: +1 },
    { code: '`21', name: 'ANYAGOK', category: 'asset' },
    { code: '`22', name: 'KÖZVETÍTETT SZOLGÁLTATÁSOK', category: 'asset' },
    // 3
    { code: '`3', name: 'Assets', category: 'asset', locked: true, sign: +1 },  // KÖVETELÉSEK
    { code: '`31', name: 'Customers', category: 'receivable' },
    { code: '`33', name: 'Members', category: 'receivable', // KÖVETELÉSEK TULAJDONOSSAL SZEMBEN
      include: 'Condominium_Payins',
    },
    { code: '`34', name: 'HÁTRALÉKOK', category: 'asset' },
    { code: '`341', name: 'Jelzáloggal nem terhelt hátralék', category: 'asset' },
    { code: '`342', name: 'Jelzáloggal terhelt hátralék', category: 'asset' },
    { code: '`343', name: 'Közös tulajdon hasznosításának hátraléka', category: 'asset' },
    { code: '`36', name: 'EGYÉB KÖVETELÉSEK', category: 'asset' },
    { code: '`38', name: 'Money accounts', category: 'asset' },
    { code: '`381', name: 'Cash register', category: 'cash', primary: true }, // Pénztár
    { code: '`382', name: 'Checking account', category: 'bank', primary: true }, // Folyószámla
    { code: '`383', name: 'Savings account', category: 'bank', primary: false }, // Megtakarítási számla
    { code: '`384', name: 'LTP', category: 'bank', primary: false }, // FUNDAMENTA
    { code: '`389', name: 'Barter account', category: 'technical' }, // Barter számla
    { code: '`39', name: 'AKTÍV IDŐBELI ELHATÁROLÁSOK', category: 'asset' },
    // 4
    { code: '`4', name: 'Liabilities', category: 'liability', locked: true, sign: -1 },  // FORRÁSOK
    { code: '`41', name: 'Equity', category: 'liability', locked: true },  //  SAJÁT TŐKE
    { code: '`413', name: 'Eredménytartalék', category: 'liability' },
    { code: '`419', name: 'Adózott eredmény', category: 'liability' },
    { code: '`43', name: 'Unidentified items', category: 'liability' },  // NEM AZONOSÍTOTT TÉTELEK
    { code: '`431', name: 'Unidentified incomes', category: 'liability' }, // Nem azonosított bevételek
    { code: '`432', name: 'Befizetések dijbeszedőn keresztül', category: 'liability' },
    { code: '`433', name: 'Postai befizetések', category: 'liability' },
    { code: '`434', name: 'Unidentified expenses', category: 'liability' }, //Nem azonosított Kiadások
    { code: '`44', name: 'HOSSZÚ LEJÁRATÚ KÖTELEZETTSÉGEK', category: 'liability' },
    { code: '`441', name: 'Hosszú lejáratú bank hitel', category: 'liability' },
    { code: '`442', name: 'Beruházási és fejlesztési hitelek', category: 'liability' },
    { code: '`443', name: 'Egyéb hitel', category: 'liability' },
    { code: '`45', name: 'RÖVID LEJÁRATÚ KÖTELEZETTSÉGEK', category: 'liability' },
    { code: '`451', name: 'Rövid lejáratú bank Hitel', category: 'liability' },
    { code: '`452', name: 'Egyéb rövid lejáratú kötelezettségek', category: 'liability' },
    { code: '`454', name: 'Suppliers', category: 'payable' },  // Szállítók
    { code: '`455', name: 'Capital goods suppliers', category: 'payable' },  //  Beruházási szállítók
    { code: '`466', name: 'VAT paid', category: 'expense' },  // Előzetesen felszámított általános forgalmi adó
    { code: '`467', name: 'VAT payable', category: 'payable' },  // Fizetendő általános forgalmi adó
    { code: '`468', name: 'VAT clearing', category: 'receivable' },  // Általános forgalmi adó elszámolási számla
    { code: '`48', name: 'PASSZÍV IDŐBELI ELHATÁROLÁSOK', category: 'liability' },
    { code: '`49', name: 'ÉVI MÉRLEGSZÁMLÁK', category: 'liability' },
    { code: '`491', name: 'Opening account', category: 'liability' },
    { code: '`492', name: 'Closing account', category: 'liability' },
    { code: '`493', name: 'Adózott eredmény elszámolása', category: 'liability' },
    { code: '`494', name: 'Előző évi eredmény elszámolása', category: 'liability' },
    // 5
    { code: '`5', name: 'KÖLTSÉGNEMEK', category: 'expense', locked: true, sign: +1 },  // 5-ös számlaosztály kész
    { code: '`51', name: 'ANYAGKÖLTSÉG', category: 'expense' },
    { code: '`5101', name: 'Víz díj', category: 'expense' },
    { code: '`5102', name: 'Áram díj', category: 'expense' },
    { code: '`5103', name: 'Gáz díj', category: 'expense' },
    { code: '`5104', name: 'Irodai anyagok', category: 'expense' },
    { code: '`5105', name: 'Karbantartási segédanyagok', category: 'expense' },
    { code: '`5106', name: 'Égők,felszerelési anyagok', category: 'expense' },
    { code: '`5107', name: 'Egyéb anyagok', category: 'expense' },
    { code: '`52', name: 'SZOLGÁLTATÁSOK KÖLTSÉGEI', category: 'expense' },
    { code: '`5201', name: 'Csatorna díjak', category: 'expense' },
    { code: '`5202', name: 'Szemét díjak', category: 'expense' },
    { code: '`5203', name: 'Takarítás', category: 'expense' },
    { code: '`5204', name: 'Kommunikációs költségek', category: 'expense' },
    { code: '`5205', name: 'Könyvelési díj', category: 'expense' },
    { code: '`5206', name: 'Közösképviselet díja', category: 'expense' },
    { code: '`5207', name: 'Jogi költségek', category: 'expense' },
    { code: '`5208', name: 'Karbantartás', category: 'expense' },
    { code: '`5209', name: 'Javítások', category: 'expense' },
    { code: '`5210', name: 'Biztonsági költségek', category: 'expense' },
    { code: '`5211', name: 'Tagdíjak', category: 'expense' },
    { code: '`5212', name: 'Kertészet', category: 'expense' },
    { code: '`5213', name: 'Egyéb megbízási, vállalkozási díjak', category: 'expense' },
    { code: '`53', name: 'EGYÉB SZOLGÁLTATÁSOK KÖLTSÉGEI', category: 'expense' },
    { code: '`531', name: 'Hatósági díjak', category: 'expense' },
    { code: '`532', name: 'Pénzügyi  díjak', category: 'expense' },
    { code: '`533', name: 'Biztosítási díjak', category: 'expense' },
    { code: '`54', name: 'BÉRKÖLTSÉG', category: 'expense' },
    { code: '`55', name: 'SZEMÉLYI JELLEGŰ EGYÉB KÖLTSÉG', category: 'expense' },
    { code: '`56', name: 'BÉRJÁRULÉKOK', category: 'expense' },
    { code: '`57', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS', category: 'expense' },
    { code: '`59', name: 'KÖLTSÉGNEMEK ÁTVEZETÉSE', category: 'expense' },
    // 8
    { code: '`8', name: 'Expenses', category: 'expense', locked: true, sign: +1 }, // RÁFORDÍTÁSOK
    { code: '`81', name: 'ANYAGJELLEGŰ RÁFORDÍTÁSOK', category: 'expense' },
    { code: '`8101', name: 'Víz díj', category: 'expense' },
    { code: '`8102', name: 'Áram díj', category: 'expense' },
    { code: '`8103', name: 'Gáz díj', category: 'expense' },
    { code: '`8104', name: 'Csatorna díjak', category: 'expense' },
    { code: '`8105', name: 'Szemét díjak', category: 'expense' },
    { code: '`8106', name: 'Irodai anyagok', category: 'expense' },
    { code: '`8107', name: 'Karbantartási segédanyagok', category: 'expense' },
    { code: '`8108', name: 'Égők,felszerelési anyagok', category: 'expense' },
    { code: '`8109', name: 'Egyéb anyagok', category: 'expense' },
    { code: '`8110', name: 'Takarítás', category: 'expense' },
    { code: '`8111', name: 'Kommunikációs költségek', category: 'expense' },
    { code: '`8112', name: 'Könyvelési díj', category: 'expense' },
    { code: '`8113', name: 'Közösképviselet díja', category: 'expense' },
    { code: '`8114', name: 'Jogi költségek', category: 'expense' },
    { code: '`8115', name: 'Karbantartás', category: 'expense' },
    { code: '`8116', name: 'Javítások', category: 'expense' },
    { code: '`8117', name: 'Biztonsági költségek', category: 'expense' },
    { code: '`8118', name: 'Tagdíjak', category: 'expense' },
    { code: '`8119', name: 'Kertészet', category: 'expense' },
    { code: '`8120', name: 'Egyéb megbízási, vállalkozási díjak', category: 'expense' },
    { code: '`8121', name: 'Hatósági díjak', category: 'expense' },
    { code: '`8122', name: 'Biztosítási díjak', category: 'expense' },
    { code: '`8123', name: 'Egyéb anyag jellegű ráfordítások', category: 'expense' },
    { code: '`82', name: 'SZEMÉLYI JELLEGŰ RÁFORDÍTÁSOK', category: 'expense' },
    { code: '`821', name: 'Bérköltség', category: 'expense' },
    { code: '`8211', name: 'Bérből: Vezető tisztségviselők juttatásai', category: 'expense' },
    { code: '`822', name: 'Személyi jellegű egyéb költség', category: 'expense' },
    { code: '`823', name: 'Bérjárulékok', category: 'expense' },
    { code: '`83', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS', category: 'expense' },
    { code: '`831', name: 'Értékcsökkenési leírás', category: 'expense' },
    { code: '`86', name: 'EGYÉB RÁFORDÍTÁSOK', category: 'expense' },
    { code: '`861', name: 'Adók és bírságok', category: 'expense' },
    { code: '`862', name: 'Egyéb ráfordítás', category: 'expense' },
    { code: '`87', name: 'PÉNZÜGYI RÁFORDÍTÁSOK', category: 'expense' },
    { code: '`871', name: 'Kamat és bank költségek', category: 'expense' },
    { code: '`89', name: 'EREDMÉNYT TERHELŐ ADÓK', category: 'expense' },
    { code: '`891', name: 'Társasági adó', category: 'expense' },
    // 9
    { code: '`9', name: 'Incomes', category: 'income', locked: true, sign: -1 },   // BEVÉTELEK
    { code: '`91', name: 'ÉRTÉKESÍTÉS ÁRBEVÉTELE', category: 'income' },
    { code: '`911', name: 'Bérleti díj bevételek', category: 'income' },
    { code: '`915', name: 'Egyéb adóköteles bevételek', category: 'income' },
    { code: '`95', name: 'Owner payins', category: 'income',
      include: 'Condominium_Payins',
    },
    { code: '`96', name: 'EGYÉB BEVÉTELEK', category: 'income' },
    { code: '`966', name: 'Támogatások', category: 'income' },
    { code: '`967', name: 'Biztosítói kártérítés', category: 'income' },
    { code: '`968', name: 'Kártérítések', category: 'income' },
    { code: '`969', name: 'Különféle egyéb bevételek', category: 'income' },
    { code: '`97', name: 'PÉNZÜGYI MŰVELETEK BEVÉTELEI', category: 'income' },
    { code: '`973', name: 'Hitelintézettől kapott kamatok', category: 'income' },
    { code: '`974', name: 'Egyéb pénzügyi bevételek', category: 'income' },
    { code: '`98', name: 'RENDKIVÜLI BEVÉTELEK', category: 'income' },
    { code: '`99', name: 'KEREKÍTÉSI NYERESÉG-VESZTESÉG', category: 'income' },
  ],
  });

  Templates.define({ _id: 'Condominium_Payins', accounts: [
    { code: '1', name: 'Közös költség előírás' },
    { code: '2', name: 'Fogyasztás előírás' },
    { code: '21', name: 'Hidegvíz előírás' },
    { code: '22', name: 'Melegvíz előírás' },
    { code: '23', name: 'Csatornadíj előírás' },
    { code: '24', name: 'Fűtési díj előírás' },
    { code: '25', name: 'Légkondícionáló előírás' },
    { code: '26', name: 'Egyéb fogyasztás előírás' },
    { code: '3', name: 'Fejlesztési alap előírás' },
    { code: '4', name: 'Egyéb előírás' },
    { code: '5', name: 'Rendkivüli befizetés előírás' },
  ],
  });

/*
  Breakdowns.define({ communityId: null,
    name: 'COA', label: 'Chart of Accounts',
    children: [
      { code: '1', include: 'BEFEKTETETT ESZKÖZÖK' },
      { code: '2', include: 'KÉSZLETEK' },
      { code: '3', include: 'Assets' }, //KÖVETELÉSEK
      { code: '4', include: 'Liabilities' }, // FORRÁSOK
      { code: '5', include: 'KÖLTSÉGNEMEK' },
      { code: '8', include: 'Expenses' }, // RÁFORDÍTÁSOK
      { code: '9', include: 'Incomes' }, //BEVÉTELEK
    ],
  });
*/
}

if (Meteor.isServer) {
  Meteor.startup(defineAccountTemplates);
}

/*
export const ACCOUNTS_PAYABLE = '454';
export const ACCOUNTS_RECEIVABLE = '31';
export const ACCOUNTS_RECEIVABLE_FROM_PARCELS = '33';
*/
