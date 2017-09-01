import { _ } from 'meteor/underscore';
import { PayAccounts } from './payaccounts.js';

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
      { name: 'Egyéb bevételek',
        children: [
         { name: 'Hitelfelvétel' },
        ],
      },
    ],
  },

  { name: 'Kiadások',
    children: [
      { name: 'Költségek',
        children: [
        { name: 'Anyag' },
        ],
      },
      { name: 'Beruházások',
        children: [
        { name: 'Épület' },
        { name: 'Gép, berendezés' },
        ],
      },
      { name: 'Egyéb kiadások',
        children: [
        { name: 'Hitel törlesztés' },
        ],
      },
    ],
  },

  { name: 'Számlák',
    children: [
      { name: '*',
        children: [
        { name: 'Pénztár' },
        { name: 'Bank főszámla' },
        { name: 'Bank felújítási alap' },
        { name: 'Hitelszámla' },
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

  { name: 'Helyek',
    children: [],
  },

  // { name: 'MEGJEGYZÉS', children: [ { name: '*', children: [ { name: 'Partner neve  (számlán,  bizonylaton)' }, { name: 'Számla száma' }, { name: 'Másik fél bankszámla vagy  pénztárbizonylat száma' }, { name: 'Közlemény' } ] } ], }
];

export function insertPayAccountTemplate(communityId) {
  PayAccountsTemplate.forEach((payaccount) => {
    PayAccounts.insert(_.extend({}, payaccount, { communityId }));
  });
}
