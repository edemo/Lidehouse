import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns/breakdowns.js';
import { TxDefs } from './tx-defs.js';

const BreakdownsTemplate = [

  { name: 'Owner payins', locked: true,
    children: [
    { code: '1', name: 'Közös költség befizetés' },
    { code: '2', name: 'Felújítási alap befizetés' },
    { code: '3', name: 'Felújítási célbefizetés' },
    { code: '4', name: 'Víz díj' },
    { code: '5', name: 'Fűtési díj' },
    { code: '6', name: 'Egyéb közvetített szolgáltatás' },
    ],
  },

  { name: 'Incomes', locked: true, sign: -1,
    children: [
      { code: '1', name: 'Owner payins', locked: true,
        include: 'Owner payins',
        children: [
          { code: '7', name: 'Unidentified payins' },
        ],
      },
      { code: '2', name: 'NEM adóköteles bevételek',
        children: [
        { code: '1', name: 'Támogatás' },
        { code: '2', name: 'Kamat pénzintézetektől' },
        ],
      },
      { code: '3', name: 'Adóköteles bevételek',
        children: [
        { code: '1', name: 'Bérleti díj' },
        { code: '2', name: 'Egyéb bevétel' },
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
      { code: '1', name: 'Költségek',
        children: [
        { code: '1', name: 'Víz' },
        { code: '2', name: 'Csatorna' },
        { code: '3', name: 'Áram' },
        { code: '4', name: 'Szemét' },
        { code: '5', name: 'Anyagok' },
        { code: '6', name: 'Takarítás' },
        { code: '7', name: 'Karbantartás' },
        { code: '8', name: 'Üzemeltetés' },
        { code: '9', name: 'Közösképviselet' },
//        { name: 'Megbízási díjak' },
//        { name: 'Bérek és közterhek' },
//        { name: 'Jogi költségek' },
//        { name: 'Hatósági díjak' },
//        { name: 'Adók és bírságok' },
//        { name: 'Kamat és bank költségek' },
//        { name: 'Egyéb költségek' },
        ],
      },
      { code: '2', name: 'Beruházások',
        children: [
        { code: '1', name: 'Épület' },
        { code: '2', name: 'Gép, berendezés' },
        ],
      },
      { code: '3', name: 'Hitel törlesztés',
        children: [
        { code: '1', name: 'Bank hitel törlesztés' },
        ],
      },
      { code: '4', name: 'Egyéb kiadások',
        children: [
        { code: '1', name: 'Egyéb kiadás' },
        ],
      },
    ],
  },

  { name: 'Assets', locked: true, sign: +1,
    children: [
      { code: '1', name: 'Tárgyi és immateriális',
        children: [
        { code: '1', name: 'Vagyoni értékű jogok' },
        { code: '2', name: 'Műszaki berendezések' },
        ],
      },
      { code: '2', name: 'Money accounts',
        children: [
        { code: '1', name: 'Bank főszámla' },
        { code: '2', name: 'Bank felújítási alap' },
        { code: '3', name: 'Fundamenta felújítási hitel' },
        { code: '4', name: 'Pénztár 1' },
        ],
      },
      { code: '3', name: 'Owner obligations',
        include: 'Owner payins',
      },
    ],
  },

  { name: 'Liabilities', locked: true, sign: -1,
    children: [
      { code: '1', name: 'Equity', locked: true,
        children: [
            { code: '1', name: 'Opening' },
            { code: '2', name: 'Carry' },
            { code: '3', name: 'Performance' },
        ],
      },
      { code: '2', name: 'Hitelek',
        children: [
        { code: '1', name: 'Bank hitel' },
        ],
      },
      { code: '3', name: 'Owners', locked: true,
        include: 'Owner payins',
        children: [],
      },
    ],
  },

  { name: 'Localizer', label: 'All locations',
    children: [
      { code: 'X', name: 'Main building',
        children: [
        ],
      },
      { code: '0', name: 'Central',
        children: [
        { code: '1', name: 'Garden' },
        { code: '2', name: 'Heating system' },
        ],
      },
    ],
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

export function insertBreakdownTemplate(communityId) {
  BreakdownsTemplate.forEach((breakdown) => {
    Breakdowns.insert(_.extend({}, breakdown, { communityId }));
  });
/*  TxDefsTemplate.forEach((txDef) => {
    TxDefs.insert(_.extend({}, txDef, { communityId }));
  });
  */
}
