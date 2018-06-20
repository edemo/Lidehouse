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
      { name: 'Opening/Carry',
        children: [
        { name: 'Opening' },
        { name: 'Carry' },
        ],
      },
      { name: 'Hitelek',
        children: [
        { name: 'Bank hitel' },
        ],
      },
      { name: 'Owners',
        children: [
        { name: 'Unidentified payins' },
        ],
        include: 'Owner payins',
      },
    ],
  },

  { name: 'Localizer', label: 'Összes hely',
    children: [
      { name: '',
        children: [
          { name: 'Főépület',
            children: [
            ],
          },
          { name: 'Központ',
            children: [
            { name: 'Kert' },
            { name: 'Kazán' },
            ],
          },
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

];

export function insertBreakdownTemplate(communityId) {
  BreakdownsTemplate.forEach((breakdown) => {
    Breakdowns.insert(_.extend({}, breakdown, { communityId }));
  });
  TxDefsTemplate.forEach((txDef) => {
    TxDefs.insert(_.extend({}, txDef, { communityId }));
  });
}
