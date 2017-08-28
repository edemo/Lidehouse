import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';
import { PayAccounts, choosePayAccount } from '/imports/api/payments/payaccounts.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Payments = new Mongo.Collection('payments');

Payments.phaseValues = ['plan', 'done'];

Payments.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  phase: { type: String, allowedValues: Payments.phaseValues, autoform: autoformOptions(Payments.phaseValues) },
  date: { type: Date },
  year: { type: Number, decimal: true, autoValue() { return this.field('date').value.getFullYear(); }, optional: true },
  month: { type: Number, decimal: true, autoValue() { return this.field('date').value.getMonth(); }, optional: true },
  amount: { type: Number, decimal: true },
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
  accounts: { type: Object, blackbox: true },
    // rootAccountName -> leafAccountName or parcelNo
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
