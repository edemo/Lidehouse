import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { TxDefs } from './txdefs.js';

  // Double entry accounting

export function defineTxDefTemplates() {
//Bill accounting -Számla kollaudálás
  
  //Basic method
  TxDefs.define({ communityId: null,
    name: 'Incoming  bill costing', // 'Bejövő számla költségelszámolása',
    debit: '5',              
    credit: '46',
  });
  
  //Simplified method
  TxDefs.define({ communityId: null,
    name: 'Bill incoming', // 'Bejövő számla',
    debit: '8',              
    credit: '46',
  });
 
  //  Inventory accounting
    TxDefs.define({ communityId: null,
    name: 'Recording inventory ', // 'Készletrevétel',
    debit: '2',              
    credit: '46',
  });
  
  TxDefs.define({ communityId: null,
    name: 'Costing of inventory ', // 'Készlet költség elszámolás',
    debit: '5',              
    credit: '2',
  });
 //end of inventory accounting
  
//Bill payment -  Bejövő számla kifizetése
  
  TxDefs.define({ communityId: null,
    name: 'Bill payment', // 'Bejövő számla kifizetése',
     debit: '46',             
    credit: '38',
  });

  TxDefs.define({ communityId: null,
    name: 'Invoice outgoing', // 'Kimenő számla',
    credit: '9',
    debit: '31',
  });

  TxDefs.define({ communityId: null,
    name: 'Invoice payment', // 'Kimenő számla teljesítés',
    credit: '31',
    debit: '32',
  });

  TxDefs.define({ communityId: null,
    name: 'Parcel invoice', // 'Albetét előírás',
    credit: '95',
    debit: '33',
  });

  TxDefs.define({ communityId: null,
    name: 'Parcel payment', // 'Albetét befizetés',
    credit: '33',
    debit: '32',
  });

  TxDefs.define({ communityId: null,
    name: 'Money transfer', // 'Pénz ki/befizetés',
    credit: '32',
    debit: '32',
  });

  // Single entry accouting
  TxDefs.define({ communityId: null,
    name: 'Income', // 'Bevétel',
    credit: '9',
    debit: '32',
  });

  TxDefs.define({ communityId: null,
    name: 'Expense', // 'Kiadás',
    credit: '32',
    debit: '8',
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
