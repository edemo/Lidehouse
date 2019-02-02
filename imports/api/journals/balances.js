import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Journals } from '/imports/api/journals/journals.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountSchema } from './account-specification.js';

export const Balances = new Mongo.Collection('balances');

Balances.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  account: { type: String }, // account code
  total: { type: Number, defaultValue: 0 },
  monthly: { type: Object, blackbox: true, defaultValue: {} },
});

Balances.attachSchema(Balances.schema);
