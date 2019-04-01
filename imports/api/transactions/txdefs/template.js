import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { TxDefs } from './txdefs.js';

  // Double entry accounting

export function defineTxDefTemplates() {
// Bill accounting -Számla kollaudálás

  // Basic method
  TxDefs.define({ communityId: null,
    name: 'Incoming  bill costing', // 'Bejövő számla költségelszámolása',
    debit: '5',
    credit: '46',
  });

  // Simplified method
  TxDefs.define({ communityId: null,
    name: 'Bill incoming', // 'Bejövő számla',
    debit: '8',
    credit: '46',
  });

  // Inventory accounting
  TxDefs.define({ communityId: null,
    name: 'Recording inventory', // 'Készletrevétel',
    debit: '2',
    credit: '46',
  });

  TxDefs.define({ communityId: null,
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    debit: '5',
    credit: '2',
  });
  //end of inventory accounting

  // Bill payment -  Bejövő számla kifizetése
 
  TxDefs.define({ communityId: null,
    name: 'Bill payment', // 'Bejövő számla kifizetése',
    debit: '46',
    credit: '38',
  });

  // Számlázás vevőknek

  TxDefs.define({ communityId: null,
    name: 'Invoice outgoing', // 'Kimenő számla',
    debit: '31',
    credit: '91',
  });

  TxDefs.define({ communityId: null,
    name: 'Invoice payment', // 'Kimenő számla befolyás',
    debit: '38',
    credit: '31',
  });

  // Albetét előírás és befizetések

  TxDefs.define({ communityId: null,
    name: 'Parcel invoice', // 'Albetét előírás',
    debit: '33',
    credit: '95',
  });

  TxDefs.define({ communityId: null,
    name: 'Parcel payment', // 'Albetét befizetés',
    debit: '32',
    credit: '33',
  });

  // Nem azonosított bevételek kezelése 
  // Befolyás
  TxDefs.define({ communityId: null,
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    debit: '38',
    credit: '43',
  });
  // Azonosítás - Identification
  TxDefs.define({ communityId: null,
    name: 'Identification', // 'Azonosítás',
    debit: '43',
    credit: '3',
  });
  
  //Pénzműveletek
  TxDefs.define({ communityId: null,
    name: 'Money transfer', // 'Átvezetés pénz számlák között',             
    debit: '38',
    credit: '38',
  });
  // Készpénz felvétel bankszámláról
  TxDefs.define({ communityId: null,
    name: 'Cash withdraw', // 'Készpénz felvétel',             
    debit: '381',
    credit: '382',
  });
  // Készpénz befizetés bankszámlára pénztárból
  TxDefs.define({ communityId: null,
    name: 'Cash deposit', // 'Készpénz befizetés',             
    debit: '382',
    credit: '381',
  });
//
// Single entry accouting

  TxDefs.define({ communityId: null,
    name: 'Income', // 'Bevétel',
    debit: '38',
    credit: '9',
  });

  TxDefs.define({ communityId: null,
    name: 'Expense', // 'Kiadás',
    debit: '8',
    credit: '38',
  });

  // Joker
  TxDefs.define({ communityId: null,
    name: 'Accounting operation', // 'Könyvelési művelet',
    credit: '',
    debit: '',
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxDefTemplates);
}
