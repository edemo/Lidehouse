import { PayAccounts } from './payaccounts.js';

export function insertPayAccountTemplate(communityId) {
  PayAccounts.insert({
    communityId,
    name: 'Bevételek',
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
  });

  PayAccounts.insert({
    communityId,
    name: 'Kiadások',
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
  });

  PayAccounts.insert({
    communityId,
    name: 'Számlák',
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
  });

  PayAccounts.insert({
    communityId,
    name: 'Helyek',
    children: [],
  });

  PayAccounts.insert({
    communityId,
    name: 'Pénzügyi elszámolások',
    children: [
      { name: '*',
        children: [
        { name: 'Készpénzfelvét' },
        { name: 'Készpénz befizetés' },
        ],
      },
    ],
  });

  // { name: 'MEGJEGYZÉS', children: [ { name: '*', children: [ { name: 'Partner neve  (számlán,  bizonylaton)' }, { name: 'Számla száma' }, { name: 'Másik fél bankszámla vagy  pénztárbizonylat száma' }, { name: 'Közlemény' } ] } ], 'communityId' : 'g5nJJYwsTyfxMfPh3', 'createdAt' : ISODate('2017-08-31T13:18:50.538Z'), 'updatedAt' : ISODate('2017-08-31T13:20:54.847Z') }
}
