import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { Txdefs } from './txdefs.js';

  // Double entry accounting

export function defineTxdefTemplates() {

  // Bill accounting -Számla kollaudálás

  Txdefs.define({ communityId: null,
    name: 'Supplier bill', // 'Bejövő számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['8', '5'],
    credit: ['46'],
  });
/*
  // Inventory accounting
  Txdefs.define({ communityId: null,
    name: 'Recording inventory', // 'Készletrevétel',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['2'],
    credit: ['46'],
  });

  Txdefs.define({ communityId: null,
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    category: 'free',
    debit: ['5'],
    credit: ['2'],
  });
  // end of inventory accounting
*/
  // Supplier payment -  Bejövő számla kifizetése

  Txdefs.define({ communityId: null,
    name: 'Supplier payment', // 'Bejövő számla kifizetése',
    category: 'payment',
    data: { relation: 'supplier' },
    debit: ['46'],
    credit: ['38'],
  });

  Txdefs.define({ communityId: null,
    name: 'Supplier bill remission', // 'Bejövő számla elengedés',
    category: 'remission',
    data: { relation: 'supplier' },
    debit: ['46'],
    credit: ['969'],
  });

  // Számlázás vevőknek

  Txdefs.define({ communityId: null,
    name: 'Customer bill', // 'Kimenő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['31'],
    credit: ['9'],
  });

  Txdefs.define({ communityId: null,
    name: 'Customer payment', // 'Kimenő számla befolyás',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['38'],
    credit: ['31'],
  });

  Txdefs.define({ communityId: null,
    name: 'Customer bill remission', // 'Kimenő számla elengedés',
    category: 'remission',
    data: { relation: 'customer' },
    debit: ['9'],
    credit: ['31'],
  });

  // Albetét előírás és befizetések

  Txdefs.define({ communityId: null,
    name: 'Parcel bill', // 'Albetét előírás',
    category: 'bill',
    data: { relation: 'parcel' },
    debit: ['33'],
    credit: ['95'],
  });

  Txdefs.define({ communityId: null,
    name: 'Parcel payment', // 'Albetét befizetés',
    category: 'payment',
    data: { relation: 'parcel' },
    debit: ['38'],
    credit: ['33'],
  });

  Txdefs.define({ communityId: null,
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'remission',
    data: { relation: 'parcel' },
    debit: ['95'],
    credit: ['33'],
  });

/*
  // Nem azonosított bevételek kezelése 
  // Befolyás
  Txdefs.define({ communityId: null,
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    category: 'payment',
    debit: ['38'],
    credit: ['43'],
  });
  // Azonosítás - Identification
  Txdefs.define({ communityId: null,
    name: 'Identification', // 'Azonosítás',
    debit: ['43'],
    credit: ['3'],
  });
*/
  // Pénzműveletek
  Txdefs.define({ communityId: null,
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    category: 'transfer',
    debit: ['38'],
    credit: ['38'],
  });
  /*
  // Készpénz felvétel bankszámláról
  Txdefs.define({ communityId: null,
    name: 'Cash withdraw', // 'Készpénz felvétel',
    category: 'transfer',
    debit: ['381'],
    credit: ['38'],
  });
  // Készpénz befizetés bankszámlára pénztárból
  Txdefs.define({ communityId: null,
    name: 'Cash deposit', // 'Készpénz befizetés',
    category: 'transfer',
    debit: ['38'],
    credit: ['381'],
  });
*/
// Single entry accouting

  Txdefs.define({ communityId: null,
    name: 'Income receipt', // 'Bevétel',
    category: 'receipt',
    data: { relation: 'customer' },
    debit: ['38'],
    credit: ['9'],
  });

  Txdefs.define({ communityId: null,
    name: 'Expense receipt', // 'Kiadás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['8'],
    credit: ['38'],
  });

  // Barter

  Txdefs.define({ communityId: null,
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'parcel' },
    debit: ['46'],
    credit: ['31', '33'],
//    debit: ['9'],
//    credit: ['8', '5'],
  });

  Txdefs.define({ communityId: null,
    name: 'Opening asset',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['1', '2', '3', '9'],
    credit: ['491'],
  });

  Txdefs.define({ communityId: null,
    name: 'Opening liability',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['491'],
    credit: ['4', '5', '8'],
  });

  Txdefs.define({ communityId: null,
    name: 'Closing asset',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['492'],
    credit: ['1', '2', '3', '9'],
  });

  Txdefs.define({ communityId: null,
    name: 'Closing liability',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['4', '5', '8'],
    credit: ['492'],
  });

  // Joker
  Txdefs.define({ communityId: null,
    name: 'Accounting operation', // 'Könyvelési művelet',
    category: 'freeTx',
    debit: [''],
    credit: [''],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxdefTemplates);
}
