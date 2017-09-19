import { _ } from 'meteor/underscore';
import { PayAccounts } from './payaccounts.js';

// TODO: AccountCathegories  would be better  than PayAccounts

const PayAccountsTemplate = [
  { name: 'Bevételek',
    children: [
      { name: 'NEM adóköteles bevételek',
        children: [
        { name: 'Közös költség befizetés' },
        { name: 'Felújítási alap befizetés' },
        { name: 'Felújítási célbefizetés' },
        { name: 'Támogatás' },
        { name: 'Víz díj' },
        { name: 'Fűtési díj' },
        { name: 'Kamat pénzintézetektől' },
        { name: 'Egyéb közvetített szolgáltatás' },
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

  { name: 'Kiadások',
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

  { name: 'Pénz számlák',
    children: [
      { name: 'Bank',
        children: [
        { name: 'Bank főszámla' },
        { name: 'Bank felújítási alap' },
        { name: 'Hitelszámla' },
        ],
      },
      { name: 'Készpénz',
        children: [
        { name: 'Pénztár 1' },
        ],
      },
    ],
  },

  { name: 'Pénzügyi elszámolások',
    children: [
      { name: '*',
        children: [
        { name: 'Készpénzfelvét' },
        { name: 'Készpénz befizetés' },
        ],
      },
    ],
  },

  { name: 'Könyvelési helyek',
    children: [
      { name: 'A épület',
        children: [
        { name: '1. Albetét' },
        { name: '2. Albetét' },
        { name: '3. Albetét' },
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

// { name: 'MEGJEGYZÉS', children: [ { name: '*', children: [ { name: 'Partner neve  (számlán,  bizonylaton)' }, { name: 'Számla száma' }, { name: 'Másik fél bankszámla vagy  pénztárbizonylat száma' }, { name: 'Közlemény' } ] } ], }
];

export function insertPayAccountTemplate(communityId) {
  PayAccountsTemplate.forEach((payaccount) => {
    PayAccounts.insert(_.extend({}, payaccount, { communityId }));
  });
}
