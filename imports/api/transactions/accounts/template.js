import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Templates } from '/imports/api/transactions/templates/templates.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

export function defineAccountTemplates() {
// Kettős könyvelés verzió
  Templates.define({ name: 'Honline előírás nemek', included: true, accounts: [
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

  Templates.define({ name: 'Honline Társasház Sablon', accounts: [
    { code: '`', name: 'Chart of Accounts', category: 'technical', locked: true },
    { code: '`0', name: 'Technical accounts', category: 'technical', locked: true },  // TECHNIKAI SZÁMLÁK
    { code: '`1', name: 'BEFEKTETETT ESZKÖZÖK', category: 'asset', locked: true, sign: +1 },
    { code: '`13', name: 'Műszaki berendezések', category: 'asset' },
    { code: '`14', name: 'Egyéb berendezésekberendezések', category: 'asset' },
    { code: '`16', name: 'Beruházások', category: 'asset' },
    { code: '`18', name: 'Hitelviszonyt metestesítő értékpapírok', category: 'asset' },
    // 2
    { code: '`2', name: 'KÉSZLETEK', category: 'asset', locked: true, sign: +1 },
    { code: '`21', name: 'Anyagok', category: 'asset' },
    { code: '`22', name: 'Közvetített szolgáltatások', category: 'asset' },
    // 3
    { code: '`3', name: 'Assets', category: 'asset', locked: true, sign: +1 },  // KÖVETELÉSEK
    { code: '`31', name: 'Customers', category: 'receivable' },
    { code: '`33', name: 'Members', category: 'receivable', // KÖVETELÉSEK TULAJDONOSSAL SZEMBEN
      include: 'Honline előírás nemek',
    },
    { code: '`34', name: 'Hátralékok', category: 'asset' },
    { code: '`341', name: 'Jelzáloggal nem terhelt hátralék', category: 'asset' },
    { code: '`342', name: 'Jelzáloggal terhelt hátralék', category: 'asset' },
    { code: '`343', name: 'Közös tulajdon hasznosításának hátraléka', category: 'asset' },
    { code: '`36', name: 'Egyéb követelések', category: 'asset' },
    { code: '`38', name: 'Money accounts', category: 'asset' },
    { code: '`381', name: 'Cash register', category: 'cash', primary: true }, // Pénztár
    { code: '`382', name: 'Checking account', category: 'bank', primary: true }, // Folyószámla
    { code: '`383', name: 'Savings account', category: 'bank', primary: false }, // Megtakarítási számla
    { code: '`384', name: 'LTP', category: 'bank', primary: false }, // FUNDAMENTA
//    { code: '`389', name: 'Barter account', category: 'technical' }, // Barter számla
    { code: '`39', name: 'Aktív időbeli elhatárolások', category: 'asset' },
    // 4
    { code: '`4', name: 'Liabilities', category: 'liability', locked: true, sign: -1 },  // FORRÁSOK
    { code: '`41', name: 'Equity', category: 'equity', locked: true },  //  SAJÁT TŐKE
    { code: '`413', name: 'Eredménytartalék', category: 'equity' },
    { code: '`414', name: 'Fejlesztési tartalék', category: 'equity' },
    { code: '`419', name: 'Mérleg szerinti eredmény', category: 'equity' },
    { code: '`43', name: 'Unidentified items', category: 'liability' },  // NEM AZONOSÍTOTT TÉTELEK
    { code: '`431', name: 'Unidentified incomes', category: 'liability' }, // Nem azonosított bevételek
    { code: '`432', name: 'Befizetések dijbeszedőn keresztül', category: 'liability' },
    { code: '`433', name: 'Postai befizetések', category: 'liability' },
    { code: '`434', name: 'Unidentified expenses', category: 'liability' }, // Nem azonosított Kiadások
    { code: '`44', name: 'Long-term liabilities', category: 'liability' }, // HOSSZÚ LEJÁRATÚ KÖTELEZETTSÉGEK
    { code: '`441', name: 'Hosszú lejáratú bank hitel', category: 'liability' },
    { code: '`442', name: 'Beruházási és fejlesztési hitelek', category: 'liability' },
    { code: '`443', name: 'Egyéb hitel', category: 'liability' },
    { code: '`45', name: 'Short-term liabilities', category: 'liability' }, // RÖVID LEJÁRATÚ KÖTELEZETTSÉGEK
    { code: '`451', name: 'Rövid lejáratú bank Hitel', category: 'liability' },
    { code: '`452', name: 'Egyéb rövid lejáratú kötelezettségek', category: 'liability' },
    { code: '`454', name: 'Suppliers', category: 'payable' },  // Szállítók
    { code: '`455', name: 'Capital goods suppliers', category: 'payable' },  //  Beruházási szállítók
    { code: '`46', name: 'Eredményt terhelő adók elszámolása', category: 'payable' },
    { code: '`461', name: 'Társasági adó kötelezettség', category: 'payable' },
    { code: '`466', name: 'VAT paid', category: 'expense' },  // Előzetesen felszámított általános forgalmi adó
    { code: '`467', name: 'VAT payable', category: 'payable' },  // Fizetendő általános forgalmi adó
    { code: '`468', name: 'VAT clearing', category: 'receivable' },  // Általános forgalmi adó elszámolási számla
    { code: '`48', name: 'Passzív  időbeli elhatárolások', category: 'liability' },
    { code: '`49', name: 'Évi mérlegszámlák', category: 'liability' },
    { code: '`491', name: 'Opening account', category: 'liability' },
    { code: '`492', name: 'Closing account', category: 'liability' },
    { code: '`493', name: 'Adózott eredmény elszámolása', category: 'liability' },
    { code: '`494', name: 'Előző évi eredmény elszámolása', category: 'liability' },
    // 5
    { code: '`5', name: 'KÖLTSÉGNEMEK', category: 'expense', locked: true, sign: +1 },  // 5-ös számlaosztály kész
    { code: '`51', name: 'Anyagköltgség', category: 'expense' },
    { code: '`511', name: 'Víz díj', category: 'expense' },
    { code: '`512', name: 'Áram díj', category: 'expense' },
    { code: '`513', name: 'Gáz díj', category: 'expense' },
    { code: '`514', name: 'Irodai anyagok', category: 'expense' },
    { code: '`515', name: 'Karbantartási segédanyagok', category: 'expense' },
    { code: '`516', name: 'Égők,felszerelési anyagok', category: 'expense' },
    { code: '`519', name: 'Egyéb anyagok', category: 'expense' },
    { code: '`52', name: 'Szolgáltatáso költségei', category: 'expense' },
    { code: '`521', name: 'Csatorna díj', category: 'expense' },
    { code: '`522', name: 'Szemét díj', category: 'expense' },
    { code: '`5221', name: 'Szemét szállítás', category: 'expense' },
    { code: '`5222', name: 'Kuka ki-be húzás', category: 'expense' },
    { code: '`5223', name: 'Rendkívüli szemét szállítás', category: 'expense' },
    { code: '`523', name: 'Takarítás', category: 'expense' },
    { code: '`5231', name: 'Épület takarítás', category: 'expense' },
    { code: '`5232', name: 'Garázs takarítás', category: 'expense' },
    { code: '`5233', name: 'Udvaros takarítás', category: 'expense' },
    { code: '`5234', name: 'Nagytakarítás', category: 'expense' },
    { code: '`5235', name: 'Alpin takarítás', category: 'expense' },
    { code: '`5236', name: 'Szőnyeg tisztítás', category: 'expense' },
    { code: '`5237', name: 'Sikosság mentesítés', category: 'expense' },
    { code: '`5238', name: 'Rendkívüli takarítás', category: 'expense' },
    { code: '`5239', name: 'Egyéb takarítás', category: 'expense' },
    { code: '`524', name: 'Kertészet', category: 'expense' },
    { code: '`525', name: 'Biztonsági költségek', category: 'expense' },
    { code: '`526', name: 'Kártevő mentesítés', category: 'expense' },
    { code: '`527', name: 'Üzemeltetés', category: 'expense' },
    { code: '`5271', name: 'Közösképviseleti díj', category: 'expense' },
    { code: '`5272', name: 'Könyvelési díj', category: 'expense' },
    { code: '`5273', name: 'Gazdasági ellenőrzés', category: 'expense' },
    { code: '`5274', name: 'Gondnokság', category: 'expense' },
    { code: '`5275', name: 'Kommunikációs költségek', category: 'expense' },
    { code: '`52751', name: 'Posta', category: 'expense' },
    { code: '`52752', name: 'Nyomtatás', category: 'expense' },
    { code: '`52753', name: 'Telefon, internet', category: 'expense' },
    { code: '`52754', name: 'Weboldal', category: 'expense' },
    { code: '`529', name: 'Egyéb megbízási-, vállalkozási díjak', category: 'expense' },
    { code: '`53', name: 'Egyéb szolgáltatások költségei', category: 'expense' },
    { code: '`531', name: 'Biztosítás díja', category: 'expense' },
    { code: '`532', name: 'Bank költségek', category: 'expense' },
    { code: '`533', name: 'Beszedési költségek', category: 'expense' },
    { code: '`534', name: 'Jogi költségek', category: 'expense' },
    { code: '`535', name: 'Szakvélemények', category: 'expense' },
    { code: '`536', name: 'Hatósági díjak', category: 'expense' },
    { code: '`537', name: 'Pályázati költségek', category: 'expense' },
    { code: '`538', name: 'Bérleti díjak', category: 'expense' },
    { code: '`54', name: 'Bérköltség', category: 'expense' },
    { code: '`55', name: 'Karbantartások, javítások', category: 'expense' },
    { code: '`551', name: 'Tűzvédelmi rendszer', category: 'expense' },
    { code: '`5511', name: 'Tűzvédelmi karbantartás', category: 'expense' },
    { code: '`55111', name: 'Tűzjelző rendszer', category: 'expense' },
    { code: '`55112', name: 'CO rendszer', category: 'expense' },
    { code: '`55113', name: 'Tűzoltó készülékek', category: 'expense' },
    { code: '`55114', name: 'Fali tűzcsapok és tüzivíz nyomásfokozó szivattyú', category: 'expense' },
    { code: '`55115', name: 'Tűzgátló ajtók', category: 'expense' },
    { code: '`55116', name: 'Tűzgátló lezárások, tűz- és füstcsappantyúk', category: 'expense' },
    { code: '`55117', name: 'Irányfények, biztonsági világítás', category: 'expense' },
    { code: '`5512', name: 'Tűzvédelmi ellenőrzések', category: 'expense' },
    { code: '`5513', name: 'Tűzvédelmi megbízott', category: 'expense' },
    { code: '`5514', name: 'Tűzjelző átjelzés', category: 'expense' },
    { code: '`5515', name: 'Kémény karbantartás', category: 'expense' },
    { code: '`55151', name: 'Kéményseprő', category: 'expense' },
    { code: '`55152', name: 'Kémény munkák', category: 'expense' },
    { code: '`552', name: 'Gépészeti munkák', category: 'expense' },
    { code: '`5521', name: 'Fűtés rendszer karbantartás', category: 'expense' },
    { code: '`5522', name: 'Klíma rendszer karbantartás', category: 'expense' },
    { code: '`5523', name: 'Lift', category: 'expense' },
    { code: '`55231', name: 'Lift karbantartás', category: 'expense' },
    { code: '`55232', name: 'Lift javítás', category: 'expense' },
    { code: '`55233', name: 'Lift elenőrzés', category: 'expense' },
    { code: '`55234', name: 'Lift felülvizsgálat', category: 'expense' },
    { code: '`55235', name: 'Lift távfelügyelet', category: 'expense' },
    { code: '`5524', name: 'Kamerarendszer', category: 'expense' },
    { code: '`5525', name: 'Villanyszerelési munkák', category: 'expense' },
    { code: '`5526', name: 'Szellőző rendszer karbantartás', category: 'expense' },
    { code: '`5527', name: 'Garázskapu és beléptető rendszer', category: 'expense' },
    { code: '`5529', name: 'Egyéb gépészeti javítások', category: 'expense' },
    { code: '`553', name: 'Szakipari munkák', category: 'expense' },
    { code: '`5531', name: 'Vízvezeték hálózat', category: 'expense' },
    { code: '`55311', name: 'Csőtörés, dugulás elhárítás', category: 'expense' },
    { code: '`55312', name: 'Esővíz szivattyú', category: 'expense' },
    { code: '`55313', name: 'Purátor', category: 'expense' },
    { code: '`5532', name: 'Lakatos munkák  (Ajtók, rácsok)', category: 'expense' },
    { code: '`5533', name: 'Bádogos munkák  (Tető)', category: 'expense' },
    { code: '`5534', name: 'Festés, mázolás', category: 'expense' },
    { code: '`5535', name: 'Homlokzat javítások', category: 'expense' },
    { code: '`5536', name: 'Burkolat javítások', category: 'expense' },
    { code: '`5537', name: 'Üveges munkák', category: 'expense' },
    { code: '`5539', name: 'Egyéb szakipari javítások', category: 'expense' },
    { code: '`56', name: 'Bérjárulékok', category: 'expense' },
    { code: '`57', name: 'Értékcsökenési leírás', category: 'expense' },
    { code: '`571', name: 'Tervezett értékcsökenés', category: 'expense' },
    { code: '`572', name: 'Terven felüli écs', category: 'expense' },
    { code: '`573', name: 'Értékhatár alatti tárgyi eszközök écs', category: 'expense' },
    { code: '`58', name: 'Felújítási munkák', category: 'expense' },
    { code: '`59', name: 'Költségnemek átvezetése', category: 'expense' },
    // 8
    { code: '`8', name: 'Expenses', category: 'expense', locked: true, sign: +1 }, // RÁFORDÍTÁSOK
    { code: '`86', name: 'Egyéb ráfordítások', category: 'expense' },
    { code: '`861', name: 'Adók', category: 'expense' },
    { code: '`862', name: 'Bírságok', category: 'expense' },
    { code: '`863', name: 'Késedelmi kamat', category: 'expense' },
    { code: '`869', name: 'Egyéb ráfordítás', category: 'expense' },
    { code: '`87', name: 'Pénzügyi ráfordítások', category: 'expense' },
    { code: '`871', name: 'Kamat költségek', category: 'expense' },
    { code: '`89', name: 'Eredményt terhelő adók', category: 'expense' },
    { code: '`891', name: 'Társasági adó', category: 'expense' },
    // 9
    { code: '`9', name: 'Incomes', category: 'income', locked: true, sign: -1 },   // BEVÉTELEK
    { code: '`91', name: 'Értékesítzés árbevétele', category: 'income' },
    { code: '`911', name: 'Bérleti díj bevételek', category: 'income' },
    { code: '`915', name: 'Egyéb adóköteles bevételek', category: 'income' },
    { code: '`95', name: 'Owner payins', category: 'income',
      include: 'Honline előírás nemek',
    },
    { code: '`96', name: 'Egyéb bevételek', category: 'income' },
    { code: '`966', name: 'Támogatások', category: 'income' },
    { code: '`967', name: 'Biztosítói kártérítés', category: 'income' },
    { code: '`968', name: 'Kártérítések', category: 'income' },
    { code: '`969', name: 'Különféle egyéb bevételek', category: 'income' },
    { code: '`97', name: 'Pénzügyi műveletek bevételei', category: 'income' },
    { code: '`973', name: 'Hitelintézettől kapott kamatok', category: 'income' },
    { code: '`974', name: 'Egyéb pénzügyi bevételek', category: 'income' },
    { code: '`98', name: 'Rendkívüli bevételek', category: 'income' },
    { code: '`981', name: 'Tovább hárított szolgáltatások', category: 'income' },
    { code: '`99', name: 'Kerekítési nyereség-veszteség', category: 'income' },
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

Accounts.insertTemplateDoc = function insertTemplateDoc(templateId, doc, includer) {
  const docToInsert = includer
    ? _.extend({ communityId: templateId }, doc, { code: includer.code + doc.code, category: includer.category })
    : _.extend({ communityId: templateId }, doc);
  Accounts.updateOrInsert({ communityId: templateId, code: docToInsert.code }, docToInsert);
  if (doc.include) {
    const includedTemplate = Templates[doc.include];
    includedTemplate.accounts.forEach(a => Accounts.insertTemplateDoc(templateId, a, doc));
  }
};

// To insert a new template doc: Just insert doc into the Template def
// To change anything other than the CODE on a template doc: just change it the Template def, and it will be changed at the next server start
// To change the CODE : change it the Template def AND use migration - Accounts.moveTemplate
// To remove a template doc: remove it from Template def AND use a migration - Accounts.moveTemplate + remove the doc from Template

if (Meteor.isServer) {
  Meteor.startup(defineAccountTemplates);
}

/*
export const ACCOUNTS_PAYABLE = '454';
export const ACCOUNTS_RECEIVABLE = '31';
export const ACCOUNTS_RECEIVABLE_FROM_PARCELS = '33';
*/
