import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Period } from '/imports/api/transactions/periods/period.js';

export const Balances = new Mongo.Collection('balances');

// Definition of a balance
Balances.defSchema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  // phase: { type: String, defaultValue: 'done', allowedValues: ['real', 'plan'] },
  account: { type: String, optional: true, defaultValue: '`' },
  localizer: { type: String, optional: true },
  partner: { type: String, optional: true },  // format: 'partnerId/contractId'
  tag: { type: String, optional: true, defaultValue: 'T' },  // can be period traffic: T, closing of a period: C, opening of a period: O, or a publication: P
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
  total() { // It returns the debit balance. Which is from the company's asset sheet's perspective
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
  if (Meteor.isClient) {
    Balances.ensureIndex({ communityId: 1, account: 1, localizer: 1, partner: 1, tag: 1 });
  } else {
    Balances.ensureIndex({ communityId: 1, account: 1, localizer: 1, partner: 1, tag: 1 });
    Balances.ensureIndex({ communityId: 1, partner: 1, localizer: 1, account: 1, tag: 1 });
    Balances.ensureIndex({ communityId: 1, tag: 1, account: 1, partner: 1, localizer: 1 });
  }
});

Balances.attachSchema(Balances.schema);
Balances.attachBehaviour(Timestamped);

// Aggregating sub-accounts balances with regexp
function subdefSelector(def) {
  const subdef = _.clone(def);
  if (def.account !== undefined) subdef.account = new RegExp('^' + def.account);
  subdef.localizer = def.localizer ? new RegExp('^' + def.localizer) : { $exists: false };
  if (subdef.partner) {
    if (subdef.partner === 'All') subdef.partner = { $exists: true };
    else subdef.partner = new RegExp('^' + subdef.partner);
  } else subdef.partner = { $exists: false };
  return subdef;
}

Balances.nullValue = function nullValue(def) {
  return _.extend({ debit: 0, credit: 0 }, def);
};

Balances.get = function get(def, balanceType) {
  if (!balanceType || balanceType === 'period') return Balances.getPeriodTraffic(def);
  if (balanceType === 'opening') return Balances.getOpeningValue(def);
  if (balanceType === 'closing') return Balances.getClosingValue(def);
  debugAssert(false, `Unknown balance type ${balanceType}`); return undefined;
};

Balances.getPeriodTraffic = function getPeriodTraffic(def) {
  Balances.defSchema.validate(def);
//  console.log("Lookin for Balance", def);
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
//    console.log("Adding balance", balance);
    result.debit += balance.debit;
    result.credit += balance.credit;
  });
  result = Balances._transform(result);
//  console.log("Resulting balance", result);

  return result;
};

Balances.increase = function increase(selector, side, amount) {
  const finderSelector = _.extend({ account: '`', partner: { $exists: false }, localizer: { $exists: false } }, selector);
  const bal = Balances.findOne(finderSelector);
  const balId = bal ? bal._id : Balances.insert(selector);
  const incObj = {}; incObj[side] = amount;
  Balances.update(balId, { $inc: incObj });
};

Balances.getOpeningValue = function getOpeningValue(def) {
  let openingBalance;
  const period = Period.fromTag(def.tag);
  const oTag = 'O' + def.tag.substr(1);
  // Should we first look for O tags in the db, if they exist? Currently only C balances can be uploaded
  if (period.type() === 'entire') openingBalance = Balances.nullValue(def);
  else {
    const prevPeriod = period.previous();
    const prevTag = prevPeriod.toTag();
    const prevTagDef = _.extend({}, def, { tag: prevTag });
    openingBalance = Balances.getClosingValue(prevTagDef);
  }
  openingBalance.tag = oTag;
  openingBalance = Balances._transform(openingBalance);
  return openingBalance;
};

Balances.getClosingValue = function getClosingValue(def) {
  let result = _.extend({ debit: 0, credit: 0 }, def);
  const cTag = 'C' + def.tag.substr(1);
  const defPeriod = Period.fromTag(def.tag);
  if (def.partner) debugAssert(defPeriod.endsOnYearEnd(), 'closing partner balance works only for end of year');
  const cBals = Balances.find(_.extend(subdefSelector(def), { tag: cTag })).fetch();
  if (cBals.length > 0) { // If there is any C balance for the given period, we assume that all C balances are uploaded for the period
    cBals.forEach(cBal => {
      result.credit += cBal.credit;
      result.debit += cBal.debit;
    });
  } else {  // If no C balance available, we have to calculate it by adding up the T balances
    if (def.tag === 'T') {
      result = Balances.get(def);  // Entire period closing C is the same as entire traffic T
    } else {
      const selector = _.extend(subdefSelector(def), { tag: new RegExp('^T-') });
      const tBals = Balances.find(selector).fetch();
      const prevBals = tBals.filter(b => {
        const period = b.period();
        if (defPeriod.endsOnYearEnd()) return (period.year <= defPeriod.year && !period.month);
        else {
          return (period.year < defPeriod.year && !period.month)
          || (period.year == defPeriod.year && (period.month && period.month <= defPeriod.month));
        }
      });
      prevBals.forEach(b => {
        result.credit += b.credit;
        result.debit += b.debit;
      });
    }
  }
  result.tag = cTag;
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
  const tagPeriod = Period.fromTag(tag);
  const type = tagPeriod.type();
  if (type === 'entire') return true;
  const valueYear = moment(valueDate).format('YYYY');
  const valueMonth = moment(valueDate).format('MM');
  if (tagPeriod.year === valueYear) {
    if (type === 'year') return true;
    if (type === 'month' && tagPeriod.month === valueMonth) return true;
  }
  return false;
}

Balances.checkCorrect = function checkCorrect(def, lang = 'en') {
  let misCalculated = null;
  if (Meteor.isClient) return; // No complete tx data on the client to perform a check.
  if (def.localizer) return; // TODO: support localizer as well
  const txs = Transactions.find({ communityId: def.communityId, $or: [{ 'debit.account': def.account }, { 'credit.account': def.account }] });
  let entryCount = 0;
  let calculatedBalance = 0;
  txs.forEach((tx) => {
    tx.journalEntries().forEach((entry) => {
      if (entry.account === def.account && (!def.partner || entry.partner === def.partner) && timeTagMatches(entry.valueDate, def.tag)) {
        entryCount += 1;
        calculatedBalance += entry.effectiveAmount();
      }
    });
  });
  const dbBalance = Balances.findOne(def).total();
  if (dbBalance !== calculatedBalance) {
    Log.error('Balance inconsistency ERROR',
      `Calculated balance of '${JSON.stringify(def)} is ${calculatedBalance} (from ${entryCount} entries)\nDb balance of same account: ${dbBalance}`);
  //  Log.info(txs.fetch());
    misCalculated = `${__('Account', {}, lang)}: ${def.account}, 
      ${__('period', {}, lang)}: ${def.tag}, 
      ${__('calculated', {}, lang)}: ${calculatedBalance}, 
      ${__('database', {}, lang)}: ${dbBalance}`;
  }
  return misCalculated;
};

Balances.checkTxCorrect = function checkTxCorrect(tx) {
  const defsToCheck = [];
  if (!tx.postedAt) return;
  tx.journalEntries().forEach(je => {
    defsToCheck.push({ communityId: tx.communityId, account: je.account, tag: 'T' });
    if (je.partner) {
      defsToCheck.push({ communityId: tx.communityId, account: je.account, tag: 'T', partner: je.partner });
    }
  });
  defsToCheck.forEach(def => {
    const err = Balances.checkCorrect(def);
    if (err) Log.error('Checking balances failed for tx:', tx);
  });
};

Balances.checkAllCorrect = function checkAllCorrect() {
  if (Meteor.isClient) return; // No complete tx data on the client to perform check.
  Balances.find({ tag: 'T' }).forEach((bal) => {
    delete bal._id;
    Balances.checkCorrect(bal);
  });
};

Balances.ensureAllCorrect = function ensureAllCorrect(communityId) {
  if (Meteor.isClient) return;
  const selector = communityId ? { communityId } : {};
  Balances.remove(selector);
  Transactions.find(selector).forEach((tx, index) => {
    if (index % 100 === 0) Log.info('Rebalanced txs', index);
    tx.updateBalances(+1);
  });
};
