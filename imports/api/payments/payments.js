import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';
import { PayAccounts, choosePayAccount } from '/imports/api/payments/payaccounts.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Payments = new Mongo.Collection('payments');

Payments.orientValues = ['plan', 'bill', 'done'];
/*
Payments.AccountSchema = new SimpleSchema({
  root: { type: String, autoform: choosePayAccount }, // regEx: SimpleSchema.RegEx.Id
  leaf: { type: String }, // PayAccounts.LeafAccountSchema // regEx: SimpleSchema.RegEx.Id, autoform: choosePayAccount
});
*/
Payments.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  orient: { type: String, allowedValues: Payments.orientValues, autoform: autoformOptions(Payments.orientValues) },
  date: { type: Date },
  amount: { type: Number, decimal: true },
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
  accounts: { type: Object, blackbox: true },
    // rootAccountName -> leafAccountName or parcelNo

//  accountsArray: { type: Array, optional: true },
//  'accountsArray.$': { type: Payments.AccountSchema },
});

Payments.helpers({
  increaseAccount() {
    return PayAccounts.findOne(this.increaseAccountId);
  },
});

Payments.attachSchema(Payments.schema);
Payments.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Payments.simpleSchema().i18n('schemaPayments');
});

// Deny all client-side updates since we will be using methods to manage this collection
Payments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
