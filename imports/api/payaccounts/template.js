import { _ } from 'meteor/underscore';
import { PayAccounts } from './payaccounts.js';

// TODO: AccountCathegories  would be better  than PayAccounts

const PayAccountsTemplate = [

  { name: 'Bevételek', locked: true,
    children: [
      { name: '',
        children: [
          { name: 'Tulajdonosi befizetések', locked: true,
            children: [
            { name: 'Közös költség befizetés', membersRelated: true },
            { name: 'Felújítási alap befizetés', membersRelated: true },
            { name: 'Felújítási célbefizetés', membersRelated: true },
            { name: 'Víz díj', membersRelated: true },
            { name: 'Fűtési díj', membersRelated: true },
            { name: 'Egyéb közvetített szolgáltatás', membersRelated: true },
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
          { name: 'Hitelfelvétel',
            children: [
              { name: 'Bank hitel' },
            ],
          },
        ],
      },
    ],
  },

  { name: 'Kiadások',  negative: true, locked: true,
    children: [
      { name: '',
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
    ],
  },

  // Ez lesz az Eszközök szamla csoport
  { name: 'Pénz számla', locked: true,
    children: [
      { name: '',
        children: [
          { name: 'Bank',
            children: [
            { name: 'Bank főszámla' },
            { name: 'Bank felújítási alap' },
            ],
          },
          { name: 'Készpénz',
            children: [
            { name: 'Pénztár 1' },
            ],
          },
        ],
      },
    ],
  },

  { name: 'Források', negative: true, locked: true,
    children: [
      { name: '',
        children: [
          { name: 'Hitelek',
            children: [
            { name: 'Hitelszámla' },
            ],
          },
        ],
      },
    ],
  },

  { name: 'Könyvelés helye', label: 'Összes hely',
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

export function insertPayAccountTemplate(communityId) {
  PayAccountsTemplate.forEach((payaccount) => {
    PayAccounts.insert(_.extend({}, payaccount, { communityId }));
  });
}
