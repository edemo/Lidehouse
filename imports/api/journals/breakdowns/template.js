import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns.js';

export function defineBreakdownTemplates() {

  //if (Breakdowns.findOne({})) return;

  Breakdowns.define({ communityId: null,
    name: 'Owner payin types', locked: true,
    children: [
    { digit: '1', name: 'Közös költség előírás' },
    { digit: '2', name: 'Felújítási alap előírás' },
    { digit: '3', name: 'Célbefizetés előírás' },
    { digit: '4', name: 'Víz díj előírás' },
    { digit: '5', name: 'Fűtési díj előírás' },
    { digit: '6', name: 'Egyéb közvetített szolgáltatás' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '9', name: 'Incomes', locked: true, sign: -1,
    children: [
      { digit: '5', name: 'Owner payins', locked: true,
        include: 'Owner payin types',
        children: [
          { digit: '7', name: 'Unidentified payins' },
        ],
      },
      { digit: '2', name: 'NEM adóköteles bevételek',
        children: [
        { digit: '1', name: 'Támogatás' },
        { digit: '2', name: 'Kamat pénzintézetektől' },
        ],
      },
      { digit: '3', name: 'Adóköteles bevételek',
        children: [
        { digit: '1', name: 'Bérleti díj' },
        { digit: '2', name: 'Egyéb bevétel' },
        ],
      },
//      { name: 'Hitelfelvétel',
//        children: [
//          { name: 'Bank hitel' },
//        ],
//      },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '8', name: 'Expenses', locked: true, sign: +1,
    children: [
      { digit: '1', name: 'Költségek',
        children: [
        { digit: '1', name: 'Víz' },
        { digit: '2', name: 'Csatorna' },
        { digit: '3', name: 'Áram' },
        { digit: '4', name: 'Szemét' },
        { digit: '5', name: 'Anyagok' },
        { digit: '6', name: 'Takarítás' },
        { digit: '7', name: 'Karbantartás' },
        { digit: '8', name: 'Üzemeltetés' },
        { digit: '9', name: 'Közösképviselet' },
//        { name: 'Megbízási díjak' },
//        { name: 'Bérek és közterhek' },
//        { name: 'Jogi költségek' },
//        { name: 'Hatósági díjak' },
//        { name: 'Adók és bírságok' },
//        { name: 'Kamat és bank költségek' },
//        { name: 'Egyéb költségek' },
        ],
      },
      { digit: '2', name: 'Beruházások',
        children: [
        { digit: '1', name: 'Épület' },
        { digit: '2', name: 'Gép, berendezés' },
        ],
      },
      { digit: '3', name: 'Hitel törlesztés',
        children: [
        { digit: '1', name: 'Bank hitel törlesztés' },
        ],
      },
      { digit: '4', name: 'Egyéb kiadások',
        children: [
        { digit: '1', name: 'Egyéb kiadás' },
        ],
      },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '3', name: 'Assets', locked: true, sign: +1,
    children: [
      { digit: '1', name: 'Tárgyi és immateriális',
        children: [
        { digit: '1', name: 'Vagyoni értékű jogok' },
        { digit: '2', name: 'Műszaki berendezések' },
        ],
      },
      { digit: '2', name: 'Money accounts',
        children: [
        { digit: '1', name: 'Folyószámla' },
        { digit: '2', name: 'Megtakarítási számla' },
        { digit: '3', name: 'Pénztár' },
        ],
      },
      { digit: '3', name: 'Owner obligations',
        include: 'Owner payin types',
      },
      { digit: '4', name: 'Hátralékok',
        children: [
        { digit: '1', name: 'Tulajdnosok jelzáloggal nem terhelt hátraléka' },
        { digit: '2', name: 'Tulajdnosok jelzáloggal terhelt hátraléka' },
        ],
      },
      { digit: '5', name: 'Egyéb követelések' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '4', name: 'Liabilities', locked: true, sign: -1,
    children: [
      { digit: '1', name: 'Equity', locked: true,
        children: [
            { digit: '1', name: 'Opening' },
            { digit: '2', name: 'Carry' },
            { digit: '3', name: 'Performance' },
        ],
      },
      { digit: '4', name: 'Hitelek',
        children: [
        { digit: '1', name: 'Bank hitel' },
        ],
      },
      { digit: '5', name: 'Szállítók' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '', name: 'Parcels', children: [
      { digit: 'A', name: 'Main building' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '', name: 'Places', children: [
      { digit: '0', name: 'Central' },
      { digit: '1', name: 'Garden' },
      { digit: '2', name: 'Heating system' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '', name: 'Localizer', label: 'Locations',
    children: [
      { digit: '@', name: 'Parcels', include: 'Parcels',
      },
      { digit: '#', name: 'Places', include: 'Places',
      },
    ],
  });

  Breakdowns.define({ communityId: null,
    name: 'COA', label: 'Chart Of Accounts',
    children: [
      { include: 'Incomes' },
      { include: 'Expenses' },
      { include: 'Assets' },
      { include: 'Liabilities' },
    ],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineBreakdownTemplates);
}

/*
const TxDefsTemplate = [

  { name: 'Obligation',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Owners/Owner payins',
      accountTo: 'Accounts/Assets/Owner obligatons',
    }],
  },

  { name: 'Payin',
    journals: [{
      accountFrom: 'Accounts/Incomes/Owner payins',
      accountTo: 'Accounts/Assets/Money accounts',
    }, {
      accountFrom: 'Accounts/Assets/Owner obligatons',
      accountTo: 'Accounts/Liabilities/Owners/Owner payins',
    }],
  },

  { name: 'Income',
    journals: [{
      accountFrom: 'Accounts/Incomes',
      accountTo: 'Accounts/Assets/Money accounts',
    }],
  },

  { name: 'Expense',
    journals: [{
      accountFrom: 'Accounts/Assets/Money accounts',
      accountTo: 'Accounts/Expenses',
    }],
  },

  { name: 'Loan',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Hitelek',
      accountTo: 'Accounts/Assets/Money accounts',
    }],
  },

  { name: 'Opening',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Opening',
      accountTo: 'Accounts/Assets',
    }],
  },

  { name: 'Backoffice Op',
    journals: [{
      accountFrom: 'Accounts',
      accountTo: 'Accounts',
    }],
  },
];
*/

/*  Breakdowns.find({ communityId: null }).forEach((breakdown) => {
    Breakdowns.insert(_.extend({}, breakdown, { communityId }));
  });
*/
/*  TxDefsTemplate.forEach((txDef) => {
    TxDefs.insert(_.extend({}, txDef, { communityId }));
  });
*/
