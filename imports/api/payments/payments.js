import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';
import { PayAccounts, choosePayAccount } from '/imports/api/payaccounts/payaccounts.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Payments = new Mongo.Collection('payments');

Payments.phaseValues = ['plan', 'bill', 'done'];

Payments.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  phase: { type: String, allowedValues: Payments.phaseValues, autoform: autoformOptions(Payments.phaseValues) },
  valueDate: { type: Date },
  year: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getFullYear(); }, optional: true, autoform: { omit: true } },
  month: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getMonth() + 1; }, optional: true, autoform: { omit: true } },
  amount: { type: Number, decimal: true },
  accounts: { type: Object, blackbox: true },
    // rootAccountName -> leafAccountName or parcelNo
  ref: { type: String, max: 100, optional: true },
  note1: { type: String, max: 100, optional: true },
  note2: { type: String, max: 100, optional: true },
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
