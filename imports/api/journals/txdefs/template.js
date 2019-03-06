import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
// import { Breakdowns } from './breakdowns.js';
import { TxDefs } from './txdefs.js';

export function defineTxDefTemplates() {
  // Double entry accounting
  TxDefs.define({ communityId: null,
    name: 'Bill incoming', // 'Bejövő számla',
    credit: '45',
    debit: '8',
  });

  TxDefs.define({ communityId: null,
    name: 'Bill payment', // 'Bejövő számla teljesítés',
    credit: '32',
    debit: '45',
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

/*
  TxDefs.define({ communityId: null,
    name: 'Obligation',
    credit: 'Accounts/Liabilities/Owners/Owner payins',
    debit: 'Accounts/Assets/Owner obligatons',
  };

  { name: 'Payin',
    journals: [{
      accountFrom: 'Accounts/Incomes/Owner payins',
      accountTo: 'Accounts/Assets/Money accounts',
    }, {
      accountFrom: 'Accounts/Assets/Owner obligatons',
      accountTo: 'Accounts/Liabilities/Owners/Owner payins',
    }],
  },

  { name: 'Income',
    journals: [{
      accountFrom: 'Accounts/Incomes',
      accountTo: 'Accounts/Assets/Money accounts',
    }],
  },

  { name: 'Expense',
    journals: [{
      accountFrom: 'Accounts/Assets/Money accounts',
      accountTo: 'Accounts/Expenses',
    }],
  },

  { name: 'Loan',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Hitelek',
      accountTo: 'Accounts/Assets/Money accounts',
    }],
  },

  { name: 'Opening',
    journals: [{
      accountFrom: 'Accounts/Liabilities/Opening',
      accountTo: 'Accounts/Assets',
    }],
  },

  { name: 'Backoffice Op',
    journals: [{
      accountFrom: 'Accounts',
      accountTo: 'Accounts',
    }],
  },
];
*/
