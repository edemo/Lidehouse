import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Period } from '/imports/api/transactions/breakdowns/period.js';

export const Balances = new Mongo.Collection('balances');

// Definition of a balance
Balances.defSchema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  // phase: { type: String, defaultValue: 'done', allowedValues: ['real', 'plan'] },
  account: { type: String, optional: true, defaultValue: '`' },
  localizer: { type: String, optional: true },
  partner: { type: String, optional: true },  // format: 'partnerId/contractId'
  tag: { type: String, optional: true, defaultValue: 'T' },  // can be for a period: T, end of a period: C, or a publication: P
}]);

// Definition + values of a balance
Balances.schema = new SimpleSchema([
  Balances.defSchema, {
    debit: { type: Number, defaultValue: 0 }, // debit sum
    credit: { type: Number, defaultValue: 0 }, // credit sum
  },
]);

Balances.idSet = ['communityId', 'account', 'localizer', 'tag'];

Balances.helpers({
  tagType() {
    return this.tag.split('-')[0];
  },
  period() {
    let periodTag = this.tag.split('-');
    periodTag.shift();
    periodTag = periodTag.join('-');
    return new Period(periodTag);
  },
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
  displayTotal() {
    let displaySign = 1;
    if (this.account) {
      switch (this.account.charAt(1)) {
        case '1':
        case '2':
        case '3':
        case '5':
        case '8': displaySign = +1; break;
        case '4':
        case '9': displaySign = -1; break;
        default: break;
      }
    }
    return displaySign * this.total();
  },
});

Meteor.startup(function indexBalances() {
  Balances.ensureIndex({ communityId: 1, account: 1, localizer: 1, partner: 1, tag: 1 });
});

Balances.attachSchema(Balances.schema);
Balances.attachBehaviour(Timestamped);

// Aggregating sub-accounts balances with regexp
function subdefSelector(def) {
  const subdef = _.clone(def);
  if (def.account !== undefined) subdef.account = new RegExp('^' + def.account);
  subdef.localizer = def.localizer ? new RegExp('^' + def.localizer) : { $exists: false };
  subdef.partner = def.partner ? new RegExp('^' + def.partner) : { $exists: false };
  return subdef;
}

Balances.get = function get(def) {
  Balances.defSchema.validate(def);
  let result = _.extend({ debit: 0, credit: 0 }, def);

//  This version is slower in gathering sub-accounts first,
//  but minimongo indexing does not handle sorting, so in fact might be faster after all
//  if (def.localizer) {
//    const parcel = Parcels.findOne({ communityId: def.communityId, code: def.localizer });
//    debugAssert(parcel.isLeaf()); // Currently not prepared for upward cascading localizer
    // If you want to know the balance of a whole floor or building, the transaction update has to trace the localizer's parents too
//  }
/*  leafs.forEach(leaf => {
    const balance = Balances.findOne({/
      communityId: def.communityId,
      account: leaf.code,
      localizer: def.localizer,
      tag: def.tag,
    });
    result += balance ? balance[side]() : 0;
  });*/

  Balances.find(subdefSelector(def)).forEach((balance) => {
    result.debit += balance.debit;
    result.credit += balance.credit;
  });
  result = Balances._transform(result);
  return result;
};

Balances.increase = function increase(selector, side, amount) {
  const finderSelector = _.extend({ partner: { $exists: false }, localizer: { $exists: false } }, selector);
  const bal = Balances.findOne(finderSelector);
  const balId = bal ? bal._id : Balances.insert(selector);
  const incObj = {}; incObj[side] = amount;
  Balances.update(balId, { $inc: incObj });
};

Balances.getCumulatedValue = function getCumulatedValue(def, d) {
  // Given a date in def, returns the cumulated total balance at that date
  const date = moment(d);
  debugAssert(date.date() === date.daysInMonth(), 'balance cumulated value works only for last day of month');
  let result = _.extend({ debit: 0, credit: 0 }, def);
  const requestedMonth = date.format('MM');
  if (def.partner) debugAssert(requestedMonth === '12', 'cumulated partner balance works only for last month of year');
  const tag = requestedMonth === '12' ? `C-${date.year()}` : `C-${date.year()}-${requestedMonth}`;
  const cBal = Balances.findOne(_.extend({}, def, { tag }));
  if (cBal) {
    result.credit = cBal.credit;
    result.debit = cBal.debit;
  // If no C balance available, we have to calculate it by adding up the T balances
  } else {
    const selector = _.extend(subdefSelector(def), { tag: new RegExp('^T-') });
    const tBals = Balances.find(selector).fetch();
    const prevBals = tBals.filter(b => {
      const period = b.period();
      if (requestedMonth === '12') return (period.year <= date.year() && !period.month);
      else {
        return (period.year < date.year() && !period.month)
        || (period.year == date.year() && (period.month && period.month <= requestedMonth));
      }
    });
    prevBals.forEach(b => {
      result.credit += b.credit;
      result.debit += b.debit;
    });
  }
  result.tag = `C-${date.year()}-${date.format('MM')}`;
  result = Balances._transform(result);
  return result;
};

Balances.checkNullBalance = function checkNullBalance(def) {
  const bal = Balances.get(def);
  if (bal.total()) {
    throw new Meteor.Error('err_unableToRemove',
      'Accounting location cannot be deleted while it has outstanding balance', `Outstanding: {${bal.total()}}`);
  }
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
  const dbBalance = Balances.get(def).total();
  if (dbBalance !== calculatedBalance) {
    Log.error('Balance inconsistency ERROR',
      `Calculated balance of '${def} is ${calculatedBalance} (from ${entryCount} entries)\nDb balance of same account: ${dbBalance}`
    );
    Log.info(txs.fetch());
  }
};

Balances.checkAllCorrect = function checkAllCorrect() {
  if (Meteor.isClient) return; // No complete tx data on the client to perform check.
  Balances.find({ tag: 'T' }).forEach((bal) => {
    delete bal._id;
    Balances.checkCorrect(bal);
  });
};

Balances.ensureAllCorrect = function ensureAllCorrect() {
  if (Meteor.isClient) return;
  Balances.remove({});
  Transactions.find({}).forEach((tx, index) => {
    if (index % 100 === 0) Log.info('Rebalanced txs', index);
    tx.updateBalances(+1);
    tx.updatePartnerBalances(+1);
  });
};
