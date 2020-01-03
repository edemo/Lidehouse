import { Meteor } from 'meteor/meteor';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { MoneyAccounts } from './money-accounts.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

MoneyAccounts.entities = {
  cashAccount: {
    name: 'cashAccount',
    schema: MoneyAccounts.simpleSchema({ category: 'cash' }),
  },
  bankAccount: {
    name: 'bankAccount',
    schema: MoneyAccounts.simpleSchema({ category: 'bank' }),
  },
};
