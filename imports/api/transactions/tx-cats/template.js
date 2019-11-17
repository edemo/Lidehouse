import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { TxCats } from './tx-cats.js';

  // Double entry accounting

export function defineTxCatTemplates() {
// Bill accounting -Számla kollaudálás

  // Basic method
//  TxCats.define({ communityId: null,
//    name: 'Incoming  bill costing', // 'Bejövő számla költségelszámolása',
//    dataType: 'bills',
//    data: { relation: 'supplier' },
//    debit: '5',
//    credit: '46',
//  });

  // Simplified method
  TxCats.define({ communityId: null,
    name: 'Supplier bill', // 'Bejövő számla',
    dataType: 'bills',
    data: { relation: 'supplier' },
    debit: '8', // ['5', '8'],
    credit: '46',
  });

  // Inventory accounting
  TxCats.define({ communityId: null,
    name: 'Recording inventory', // 'Készletrevétel',
    dataType: 'bills',
    data: { relation: 'supplier' },
    debit: '2',
    credit: '46',
  });

  TxCats.define({ communityId: null,
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    debit: '5',
    credit: '2',
  });
  // end of inventory accounting

  // Supplier payment -  Bejövő számla kifizetése

  TxCats.define({ communityId: null,
    name: 'Supplier payment', // 'Bejövő számla kifizetése',
    dataType: 'payments',
    data: { relation: 'supplier' },
    debit: '46',
    credit: '38',
  });

  // Számlázás vevőknek

  TxCats.define({ communityId: null,
    name: 'Customer bill', // 'Kimenő számla',
    dataType: 'bills',
    data: { relation: 'customer' },
    debit: '31',
    credit: '91',
  });

  TxCats.define({ communityId: null,
    name: 'Customer payment', // 'Kimenő számla befolyás',
    dataType: 'payments',
    data: { relation: 'customer' },
    debit: '38',
    credit: '31',
  });

  // Albetét előírás és befizetések

  TxCats.define({ communityId: null,
    name: 'Parcel bill', // 'Albetét előírás',
    dataType: 'bills',
    data: { relation: 'parcel' },
    debit: '33',
    credit: '95',
  });

  TxCats.define({ communityId: null,
    name: 'Parcel payment', // 'Albetét befizetés',
    dataType: 'payments',
    data: { relation: 'parcel' },
    debit: '38',
    credit: '33',
  });

  // Nem azonosított bevételek kezelése 
  // Befolyás
  TxCats.define({ communityId: null,
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    dataType: 'payments',
    debit: '38',
    credit: '43',
  });
  // Azonosítás - Identification
  TxCats.define({ communityId: null,
    name: 'Identification', // 'Azonosítás',
    debit: '43',
    credit: '3',
  });

  //Pénzműveletek
  TxCats.define({ communityId: null,
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    debit: '38',
    credit: '38',
  });
  // Készpénz felvétel bankszámláról
  TxCats.define({ communityId: null,
    name: 'Cash withdraw', // 'Készpénz felvétel',
    debit: '381',
    credit: '382',
  });
  // Készpénz befizetés bankszámlára pénztárból
  TxCats.define({ communityId: null,
    name: 'Cash deposit', // 'Készpénz befizetés',
    debit: '382',
    credit: '381',
  });

// Single entry accouting

  TxCats.define({ communityId: null,
    name: 'Income', // 'Bevétel',
    debit: '38',
    credit: '9',
  });

  TxCats.define({ communityId: null,
    name: 'Expense', // 'Kiadás',
    debit: '8',
    credit: '38',
  });

  // Joker
  TxCats.define({ communityId: null,
    name: 'Accounting operation', // 'Könyvelési művelet',
    debit: '',
    credit: '',
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxCatTemplates);
}
