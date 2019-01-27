import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns.js';
import { TxDefs } from '../tx-defs.js';

Meteor.startup(function() {
  Breakdowns.define({
    name: 'Owner payin types', locked: true,
    children: [
    { digit: '1', name: 'Közös költség befizetés' },
    { digit: '2', name: 'Felújítási alap befizetés' },
    { digit: '3', name: 'Felújítási célbefizetés' },
    { digit: '4', name: 'Víz díj' },
    { digit: '5', name: 'Fűtési díj' },
    { digit: '6', name: 'Egyéb közvetített szolgáltatás' },
    ],
  });

  Breakdowns.define({
    digit: '3', name: 'Incomes', locked: true, sign: -1,
    children: [
      { digit: '1', name: 'Owner payins', locked: true,
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

  Breakdowns.define({
    digit: '3', name: 'Expenses', locked: true, sign: +1,
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

  Breakdowns.define({
    digit: '1', name: 'Assets', locked: true, sign: +1,
    children: [
      { digit: '1', name: 'Tárgyi és immateriális',
        children: [
        { digit: '1', name: 'Vagyoni értékű jogok' },
        { digit: '2', name: 'Műszaki berendezések' },
        ],
      },
      { digit: '2', name: 'Money accounts',
        children: [
        { digit: '1', name: 'Bank főszámla' },
        { digit: '2', name: 'Bank felújítási alap' },
        { digit: '3', name: 'Fundamenta felújítási hitel' },
        { digit: '4', name: 'Pénztár 1' },
        ],
      },
      { digit: '3', name: 'Owner obligations',
        include: 'Owner payin types',
      },
    ],
  });

  Breakdowns.define({
    digit: '6', name: 'Liabilities', locked: true, sign: -1,
    children: [
      { digit: '1', name: 'Equity', locked: true,
        children: [
            { digit: '1', name: 'Opening' },
            { digit: '2', name: 'Carry' },
            { digit: '3', name: 'Performance' },
        ],
      },
      { digit: '2', name: 'Hitelek',
        children: [
        { digit: '1', name: 'Bank hitel' },
        ],
      },
      { digit: '3', name: 'Owners', locked: true,
        include: 'Owner payin types',
        children: [],
      },
    ],
  });

  Breakdowns.define({
    digit: '7', name: 'Localizer', label: 'Locations',
    children: [
      { digit: 'X', name: 'Main building',
        children: [
        ],
      },
      { digit: '0', name: 'Central',
        children: [
        { digit: '1', name: 'Garden' },
        { digit: '2', name: 'Heating system' },
        ],
      },
    ],
  });

  Breakdowns.define({
    name: 'ChartOfAccounts', label: 'Accounts',
    children: [
      { include: 'Incomes' },
      { include: 'Expenses' },
      { include: 'Assets' },
      { include: 'Liabilities' },
    ],
  });
});


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
/*  Breakdowns.find({ communityId: { $exists: false } }).forEach((breakdown) => {
    Breakdowns.insert(_.extend({}, breakdown, { communityId }));
  });
*/
/*  TxDefsTemplate.forEach((txDef) => {
    TxDefs.insert(_.extend({}, txDef, { communityId }));
  });
*/
}
