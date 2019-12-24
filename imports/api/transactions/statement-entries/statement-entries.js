import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import { chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  account: { type: String, autoform: chooseSubAccount('COA', '38') },
  ref: { type: String, max: 50 }, // external (uniq) ref id provided by the bank
  valueDate: { type: Date },
  amount: { type: Number },
  partner: { type: String, max: 50, optional: true },
  note: { type: String, max: 200, optional: true },
  statementId: { type: String, /* regEx: SimpleSchema.RegEx.Id, */ optional: true, autoform: { omit: true } },
  original: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  reconciledId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

StatementEntries.idSet = ['communityId', 'ref'];

Meteor.startup(function indexTransactions() {
  Transactions.ensureIndex({ extId: 1 });
  Transactions.ensureIndex({ reconciledId: 1 });
//  if (Meteor.isClient && MinimongoIndexing) {
  if (Meteor.isServer) {
    StatementEntries._ensureIndex({ communityId: 1, valueDate: 1 });
  }
});

StatementEntries.helpers({
  isReconciled() {
    return (!!this.reconciledId);
  },
});

Meteor.startup(function indexStatements() {
});

StatementEntries.attachSchema(StatementEntries.schema);

Meteor.startup(function attach() {
  StatementEntries.simpleSchema().i18n('schemaTransactions');
});
// --- Factory ---

Factory.define('statementEntry', StatementEntries, {
  account: '31',
  valueDate: new Date(),
  partner: faker.random.word(),
  note: faker.random.word(),
  amount: 10000,
});

// --- Reconciliation ---

const chooseBill = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const bills = Transactions.find({ communityId, category: 'bill', outstanding: { $gt: 0 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId()} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

const choosePayment = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const payments = Transactions.find({ communityId, category: 'payment', reconciledId: { $exists: false } });
    const options = payments.map(function option(payment) {
      return { label: `${payment.partner()} ${moment(payment.valueDate).format('L')} ${payment.amount} ${payment.note || ''}`, value: payment._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

StatementEntries.reconcileSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  paymentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: choosePayment },
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseBill },
  account: { type: String, optional: true, autoform: chooseAccountNode },
});

Meteor.startup(function attach() {
  StatementEntries.reconcileSchema.i18n('schemaReconiliation');
});
