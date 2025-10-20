import { Meteor } from 'meteor/meteor';
import { Accounts } from './accounts.js';

Accounts.entities = {
  simpleAccount: {
    name: 'simpleAccount',
    schema: Accounts.simpleSchema({ category: 'technical' }),
  },
  cashAccount: {
    name: 'cashAccount',
    schema: Accounts.simpleSchema({ category: 'cash' }),
  },
  bankAccount: {
    name: 'bankAccount',
    schema: Accounts.simpleSchema({ category: 'bank' }),
  },
};
