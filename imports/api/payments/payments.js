import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';
import { PayAccounts, choosePayAccount } from '/imports/api/payaccounts/payaccounts.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Legs = new Mongo.Collection('legs');

function legsOf(tx) {
  const legs = [];
  if (tx.accountFrom) {
    const legFrom = _.clone(tx);
    legFrom.account = _.clone(tx.accountFrom);
    legFrom.txId = tx._id;
    delete legFrom._id;
    delete legFrom.accountFrom;
    delete legFrom.accountTo;
    delete legFrom.legs;
    legFrom.amount *= -1;
    legs.push(legFrom);
  }
  if (tx.accountTo) {
    const legTo = _.clone(tx);
    legTo.account = _.clone(tx.accountTo);
    legTo.txId = tx._id;
    delete legTo._id;
    delete legTo.accountFrom;
    delete legTo.accountTo;
    delete legTo.legs;
    legs.push(legTo);
  }
  return legs;
}

class PaymentsCollection extends Mongo.Collection {
  insert(tx, callback) {
    const _id = super.insert(tx, callback);
    _.extend(tx, { _id });
//    console.log("tx", tx);
    legsOf(tx).forEach(leg => { /*console.log("leg", leg);*/ Legs.insert(leg); });
    return _id;
  }
  remove(selector, callback) {
    Legs.remove({ txId: selector });
    return super.remove(selector, callback);
  }
}

export const Payments = new PaymentsCollection('payments');

Payments.phaseValues = ['plan', 'bill', 'done'];

const BasicTxSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  phase: { type: String, allowedValues: Payments.phaseValues, autoform: autoformOptions(Payments.phaseValues) },
  valueDate: { type: Date },
  year: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getFullYear(); }, optional: true, autoform: { omit: true } },
  month: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getMonth() + 1; }, optional: true, autoform: { omit: true } },
  amount: { type: Number, decimal: true },
});

Payments.schema = new SimpleSchema([
  BasicTxSchema, {
    // affected accounts
    accountFrom: { type: Object, blackbox: true, optional: true },
    accountTo: { type: Object, blackbox: true, optional: true },
      // rootAccountName -> leafAccountName or parcelNo
    ref: { type: String, max: 100, optional: true },
    note: { type: String, max: 100, optional: true },
  }]
);

Legs.schema = new SimpleSchema([
  BasicTxSchema, {
    // affected accounts
    account: { type: Object, blackbox: true, optional: true },
      // rootAccountName -> leafAccountName or parcelNo
    ref: { type: String, max: 100, optional: true },
    note: { type: String, max: 100, optional: true },
    txId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }]
);

Payments.accountFilter = function createAccountFilterFrom(filter) {
  // To handle both 'from' and 'to' side. This func from a filter like { 'Income': 'CommonCost' }
  // creates a filter like { $or [{ 'accountFrom.Income': 'CommonCost' }, { 'accountTo.Income': 'CommonCost' }] }
  const accounts = Object.keys(filter);
  debugAssert(accounts.length === 1);
  const account = accounts[0];
  const splitted = account.split('.');
  debugAssert(splitted[0] === 'accounts');
  const accountName = splitted[1];
  const value = filter[account];
  const fromCondition = {};
  fromCondition[`accountFrom.${accountName}`] = value;
  const toCondition = {};
  toCondition[`accountTo.${accountName}`] = value;
  const modifiedFilter = { $or: [fromCondition, toCondition] };
  return modifiedFilter;
};

// A *payment* is effecting a certain field (in pivot tables) with the *amount* of the payment,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the phase (done => +1, bill, plan => -1)
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: Sign of the account type itself will control how we display it, and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)
Payments.signOfImpact = function (payment, field, values) {
  const splitted = field.split('.');
  let result = +1;
  result *= payment.phase === 'done' ? +1 : -1;
  if (splitted[0] === 'accounts') {  // in case of account tags
    const accountName = splitted[1];
//    if (PayAccounts.signs[accountName]) result *= PayAccounts.signs[accountName];
//    else return undefined;
    if (payment.goesFrom(accountName, values)) result *= -1;
    else if (payment.goesTo(accountName, values)) result *= +1;
//    else /* its in none of the two, or is in both of them */ debugAssert(false);
  }
  return result;
};

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

//------------------------------------

Legs.attachSchema(Legs.schema);

// Deny all updates, it is updated only indirectly through the Payments collection updates
Legs.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
