import { Meteor } from 'meteor/meteor';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Accounts } from './accounts.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Accounts.entities = {
  simpleAccount: {
    name: 'simpleAccount',
    schema: Accounts.simpleSchema({ category: 'technical' }),
  },
  cashAccount: {
    name: 'cashAccount',
    schema: Accounts.simpleSchema({ category: 'cash' }),
    omitFields: ['category'],
  },
  bankAccount: {
    name: 'bankAccount',
    schema: Accounts.simpleSchema({ category: 'bank' }),
    omitFields: ['category'],
  },
};
