import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { TxDefs } from './tx-defs.js';

  // Double entry accounting

export function defineTxDefTemplates() {

  // Bill accounting -Számla kollaudálás

  TxDefs.define({ communityId: null,
    name: 'Supplier bill', // 'Bejövő számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['8', '5'],
    credit: ['46'],
  });
/*
  // Inventory accounting
  TxDefs.define({ communityId: null,
    name: 'Recording inventory', // 'Készletrevétel',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['2'],
    credit: ['46'],
  });

  TxDefs.define({ communityId: null,
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    category: 'free',
    debit: ['5'],
    credit: ['2'],
  });
  // end of inventory accounting
*/
  // Supplier payment -  Bejövő számla kifizetése

  TxDefs.define({ communityId: null,
    name: 'Supplier payment', // 'Bejövő számla kifizetése',
    category: 'payment',
    data: { relation: 'supplier' },
    debit: ['46'],
    credit: ['38'],
  });

  TxDefs.define({ communityId: null,
    name: 'Supplier bill remission', // 'Bejövő számla elengedés',
    category: 'payment',
    data: { relation: 'supplier' },
    debit: ['46'],
    credit: ['8', '5'],
  });

  // Számlázás vevőknek

  TxDefs.define({ communityId: null,
    name: 'Customer bill', // 'Kimenő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['31'],
    credit: ['9'],
  });

  TxDefs.define({ communityId: null,
    name: 'Customer payment', // 'Kimenő számla befolyás',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['38'],
    credit: ['31'],
  });

  TxDefs.define({ communityId: null,
    name: 'Customer bill remission', // 'Kimenő számla elengedés',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['9'],
    credit: ['31'],
  });

  // Albetét előírás és befizetések

  TxDefs.define({ communityId: null,
    name: 'Parcel bill', // 'Albetét előírás',
    category: 'bill',
    data: { relation: 'parcel' },
    debit: ['33'],
    credit: ['95'],
  });

  TxDefs.define({ communityId: null,
    name: 'Parcel payment', // 'Albetét befizetés',
    category: 'payment',
    data: { relation: 'parcel' },
    debit: ['38'],
    credit: ['33'],
  });

  TxDefs.define({ communityId: null,
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'payment',
    data: { relation: 'parcel' },
    debit: ['95'],
    credit: ['33'],
  });

/*
  // Nem azonosított bevételek kezelése 
  // Befolyás
  TxDefs.define({ communityId: null,
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    category: 'payment',
    debit: ['38'],
    credit: ['43'],
  });
  // Azonosítás - Identification
  TxDefs.define({ communityId: null,
    name: 'Identification', // 'Azonosítás',
    debit: ['43'],
    credit: ['3'],
  });
*/
  // Pénzműveletek
  TxDefs.define({ communityId: null,
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    category: 'transfer',
    debit: ['38'],
    credit: ['38'],
  });
  /*
  // Készpénz felvétel bankszámláról
  TxDefs.define({ communityId: null,
    name: 'Cash withdraw', // 'Készpénz felvétel',
    category: 'transfer',
    debit: ['381'],
    credit: ['38'],
  });
  // Készpénz befizetés bankszámlára pénztárból
  TxDefs.define({ communityId: null,
    name: 'Cash deposit', // 'Készpénz befizetés',
    category: 'transfer',
    debit: ['38'],
    credit: ['381'],
  });
*/
// Single entry accouting

  TxDefs.define({ communityId: null,
    name: 'Income', // 'Bevétel',
    category: 'receipt',
    data: { relation: 'customer' },
    debit: ['38'],
    credit: ['9'],
  });

  TxDefs.define({ communityId: null,
    name: 'Expense', // 'Kiadás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['8'],
    credit: ['38'],
  });

  // Barter

  TxDefs.define({ communityId: null,
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'parcel' },
    debit: ['46'],
    credit: ['31', '33'],
//    debit: ['9'],
//    credit: ['8', '5'],
  });

  TxDefs.define({ communityId: null,
    name: 'Opening',
    category: 'opening',
    debit: [''],
    credit: ['0'],
  });

  // Joker
  TxDefs.define({ communityId: null,
    name: 'Accounting operation', // 'Könyvelési művelet',
    category: 'freeTx',
    debit: [''],
    credit: [''],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxDefTemplates);
}
