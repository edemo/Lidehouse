import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns/breakdowns.js';
import { TxDefs } from './tx-defs.js';

const BreakdownsTemplate = [

  { name: 'Owner payins', locked: true,
    children: [
    { name: 'Közös költség befizetés' },
    { name: 'Felújítási alap befizetés' },
    { name: 'Felújítási célbefizetés' },
    { name: 'Víz díj' },
    { name: 'Fűtési díj' },
    { name: 'Egyéb közvetített szolgáltatás' },
    ],
  },

  { name: 'Incomes', locked: true, sign: -1,
    children: [
      { name: 'Owner payins', locked: true,
        include: 'Owner payins',
        children: [
          { name: 'Unidentified payins' },
        ],
      },
      { name: 'NEM adóköteles bevételek',
        children: [
        { name: 'Támogatás' },
        { name: 'Kamat pénzintézetektől' },
        ],
      },
      { name: 'Adóköteles bevételek',
        children: [
        { name: 'Bérleti díj' },
        { name: 'Egyéb bevétel' },
        ],
      },
//      { name: 'Hitelfelvétel',
//        children: [
//          { name: 'Bank hitel' },
//        ],
//      },
    ],
  },

  { name: 'Expenses', locked: true, sign: +1,
    children: [
      { name: 'Költségek',
        children: [
        { name: 'Víz' },
        { name: 'Csatorna' },
        { name: 'Áram' },
        { name: 'Szemét' },
        { name: 'Anyagok' },
        { name: 'Takarítás' },
        { name: 'Karbantartás' },
        { name: 'Üzemeltetés' },
        { name: 'Közösképviselet' },
        { name: 'Megbízási díjak' },
        { name: 'Bérek és közterhek' },
        { name: 'Jogi költségek' },
        { name: 'Hatósági díjak' },
        { name: 'Adók és bírságok' },
        { name: 'Kamat és bank költségek' },
        { name: 'Egyéb költségek' },
        ],
      },
      { name: 'Beruházások',
        children: [
        { name: 'Épület' },
        { name: 'Gép, berendezés' },
        ],
      },
      { name: 'Hitel törlesztés',
        children: [
        { name: 'Bank hitel törlesztés' },
        ],
      },
      { name: 'Egyéb kiadások',
        children: [
        { name: 'Egyéb kiadás' },
        ],
      },
    ],
  },

  { name: 'Assets', locked: true, sign: +1,
    children: [
      { name: 'Tárgyi és immateriális',
        children: [
        { name: 'Vagyoni értékű jogok' },
        { name: 'Műszaki berendezések' },
        ],
      },
      { name: 'Pénz számlák',
        children: [
        { name: 'Bank főszámla' },
        { name: 'Bank felújítási alap' },
        { name: 'Hitel számla' },
        { name: 'Pénztár 1' },
        ],
      },
      { name: 'Owner obligations',
        include: 'Owner payins',
      },
    ],
  },

  { name: 'Liabilities', locked: true, sign: -1,
    children: [
      { name: 'Hitelek',
        children: [
        { name: 'Bank hitel' },
        ],
      },
    ],
  },

  { name: 'Equity', locked: true, sign: -1,
    children: [
      { name: 'Initialize',
        children: [
        { name: 'Opening' },
        { name: 'Carry' },
        ],
      },
    ],
  },

  { name: 'Localizer', label: 'All locations',
    children: [
      { name: 'Main building',
        children: [
        ],
      },
      { name: 'Central',
        children: [
        { name: 'Garden' },
        { name: 'Heating system' },
        ],
      },
    ],
  },

  { name: 'Owners', locked: true, sign: -1,
    include: 'Owner payins',
    children: [],
  },

  /*
  { name: 'Vonatkozó időszak',
    children: [
      { name: '2017',
        children: [
        { name: '2017-01' },
        { name: '2017-02' },
        { name: '2017-03' },
        { name: '2017-04' },
        { name: '2017-05' },
        { name: '2017-06' },
        { name: '2017-07' },
        { name: '2017-08' },
        { name: '2017-09' },
        { name: '2017-10' },
        { name: '2017-11' },
        { name: '2017-12' },
        ],
      },
      { name: '2018',
        children: [
        { name: '2018-01' },
        { name: '2018-02' },
        { name: '2018-03' },
        { name: '2018-04' },
        { name: '2018-05' },
        { name: '2018-06' },
        { name: '2018-07' },
        { name: '2018-08' },
        { name: '2018-09' },
        { name: '2018-10' },
        { name: '2018-11' },
        { name: '2018-12' },
        ],
      },
    ],
  },
*/
];

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
      accountTo: 'Accounts/Assets/Pénz számlák',
    }, {
      accountFrom: 'Accounts/Assets/Owner obligatons',
      accountTo: 'Accounts/Liabilities/Owners/Owner payins',
    }],
  },

  { name: 'Income',
    journals: [{
      accountFrom: 'Accounts/Incomes',
      accountTo: 'Accounts/Assets/Pénz számlák',
    }],
  },

  { name: 'Expense',
    journals: [{
      accountFrom: 'Accounts/Assets/Pénz számlák',
      accountTo: 'Accounts/Expenses',
    }],
  },

  { name: 'Loan',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Hitelek',
      accountTo: 'Accounts/Assets/Pénz számlák',
    }],
  },

  { name: 'Opening',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Initialize/Opening',
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

export function insertBreakdownTemplate(communityId) {
  BreakdownsTemplate.forEach((breakdown) => {
    Breakdowns.insert(_.extend({}, breakdown, { communityId }));
  });
/*  TxDefsTemplate.forEach((txDef) => {
    TxDefs.insert(_.extend({}, txDef, { communityId }));
  });
  */
}
