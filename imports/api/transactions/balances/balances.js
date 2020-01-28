import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';

export const Balances = new Mongo.Collection('balances');

// Definition of a balance
Balances.defSchema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  // phase: { type: String, defaultValue: 'done', allowedValues: ['real', 'plan'] },
  account: { type: String },
  localizer: { type: String, optional: true },
  tag: { type: String },  // can be a period, end of a period, or a publication
}]);

// Definition + values of a balance
Balances.schema = new SimpleSchema([Balances.defSchema, {
  debit: { type: Number, defaultValue: 0 }, // debit total
  credit: { type: Number, defaultValue: 0 }, // credit total
}]);

Balances.idSet = ['communityId', 'account', 'localizer', 'tag'];

Balances.helpers({
  total() {
    return this.debit - this.credit;
  },
  debitSum() {
    return this.debit;
  },
  creditSum() {
    return this.credit;
  },
  debitTotal() {
    return (this.debit > this.credit) ? (this.debit - this.credit) : 0;
  },
  creditTotal() {
    return (this.credit > this.debit) ? (this.credit - this.debit) : 0;
  },
});

Meteor.startup(function indexBalances() {
  Balances.ensureIndex({ communityId: 1, account: 1, localizer: 1, tag: 1 });
});

Balances.attachSchema(Balances.schema);
Balances.attachBehaviour(Timestamped);

Balances.getSum = function getSum(def, side) {
  Balances.defSchema.validate(def);
  let result = 0;

//  This version is slower in gathering sub-accounts first,
//  but minimongo indexing does not handle sorting, so in fact might be faster after all
//  const coa = ChartOfAccounts.get(def.communityId);
//  const leafs = coa.leafsOf(def.account);
  if (def.localizer) {
    const loc = Localizer.get(def.communityId);
    const locNode = loc.nodeByCode(def.localizer);
    debugAssert(locNode.isLeaf); // Currently not prepared for upward cascading localizer
    // If you want to know the balance of a whole floor or building, the transaction update has to trace the localizer's parents too
  }
/*  leafs.forEach(leaf => {
    const balance = Balances.findOne({/
      communityId: def.communityId,
      account: leaf.code,
      localizer: def.localizer,
      tag: def.tag,
    });
    result += balance ? balance[side]() : 0;
  });*/

  // Aggregating sub-accounts balances with regexp
  const subdef = _.clone(def);
  if (def.account) subdef.account = new RegExp('^' + def.account);
//  if (def.localizer) subdef.localizer = new RegExp('^' + def.localizer);
  subdef.localizer = def.localizer ? def.localizer : { $exists: false };
  Balances.find(subdef).forEach(balance => result += balance[side]());

  return result;
};

Balances.getTotal = function getTotal(def) {
  return Balances.getSum(def, 'total');
};

Balances.getDisplaySum = function getDisplaySum(def, side) {
  const sum = Balances.getSum(def, side);
  if (side !== 'total') return sum;
  let displaySign = 1;
  if (def.account) {
    switch (def.account.charAt(0)) {
      case '1':
      case '2':
      case '3':
      case '8': displaySign = +1; break;
      case '4':
      case '5':
      case '9': displaySign = -1; break;
      default: break;
    }
  }
  return displaySign * sum;
};

Balances.getDisplayTotal = function getDisplayTotal(def) {
  return Balances.getDisplaySum('total');
};

function timeTagMatches(valueDate, tag) {
  return tag === 'T'; // TODO: support other tags as well
}

Balances.checkCorrect = function checkCorrect(def) {
  if (Meteor.isClient) return; // No complete tx data on the client to perform a check.
  if (def.tag !== 'T' || def.localizer) return; // TODO: support other tags / localizer as well
  const txs = Transactions.find({ communityId: def.communityId, $or: [{ 'debit.account': def.account }, { 'credit.account': def.account }] });
  let entryCount = 0;
  let calculatedBalance = 0;
  txs.forEach((tx) => {
    tx.journalEntries().forEach((entry) => {
      if (entry.account === def.account && timeTagMatches(entry.valueDate, def.tag)) {
        entryCount += 1;
        calculatedBalance += entry.effectiveAmount();
      }
    });
  });
  const dbBalance = Balances.getTotal(def);
  if (dbBalance !== calculatedBalance) {
    console.log('Balance inconsistency ERROR',
      `Calculated balance of '${def} is ${calculatedBalance} (from ${entryCount} entries)\nDb balance of same account: ${dbBalance}`
    );
    console.log(txs.fetch());
  }
};

Balances.checkAllCorrect = function checkAllCorrect() {
  if (Meteor.isClient) return; // No complete tx data on the client to perform check.
  Balances.find({ tag: 'T' }).forEach((bal) => {
    delete bal._id;
    Balances.checkCorrect(bal);
  });
};
