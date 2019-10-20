import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  account: { type: String },
  valueDate: { type: Date },
  partner: { type: String, max: 50 },
  note: { type: String, max: 200 },
  amount: { type: Number },
  reconciledId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  statementId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

StatementEntries.helpers({
  isReconciled() {
    return (!!this.reconciledId);
  },
});

Meteor.startup(function indexStatements() {
  if (Meteor.isServer) {
    StatementEntries._ensureIndex({ communityId: 1, valueDate: 1 });
  }
});

StatementEntries.attachSchema(StatementEntries.schema);

// --- Factory ---

Factory.define('statementEntry', StatementEntries, {
  communityId: () => Factory.get('community'),
  account: '31',
  valueDate: new Date(),
  partner: faker.random.word(),
  note: faker.random.word(),
  amount: 10000,
});

// --- Reconciliation ---

let chooseBill = {};
let choosePayment = {};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  chooseBill = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const bills = Bills.find({ communityId, outstanding: { $gte: 0 } }).fetch();
      const options = bills.map(function option(bill) {
        return { label: `${bill.serialId()} ${bill.partner} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
  choosePayment = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const payments = Payments.find({ communityId, reconciledId: { $exists: false } }).fetch();
      const options = payments.map(function option(payment) {
        return { label: `${payment.partner} ${moment(payment.valueDate).format('L')} ${payment.amount} ${payment.note}`, value: payment._id };
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
}

StatementEntries.reconcileSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  paymentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: choosePayment },
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseBill },
});

Meteor.startup(function attach() {
  StatementEntries.reconcileSchema.i18n('schemaReconiliation');
});
