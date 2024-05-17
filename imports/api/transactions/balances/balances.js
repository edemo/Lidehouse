import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import { AccountingPeriods } from '/imports/api/transactions/periods/accounting-periods.js';

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

Balances.idSet = [['communityId', 'account', 'localizer', 'tag']];

function getTypeOfTag(tag) {
  return tag[0];
}

function setTypeOfTag(tag, balanceType) {
  debugAssert(balanceType.length === 1);
  const split = tag.split('-');
  split[0] = balanceType;
  return split.join('-');
}

Balances.helpers({
  tagType(setVal) {
    if (setVal) {
      this.tag = setTypeOfTag(this.tag, setVal);
      return setVal;
    } else return getTypeOfTag(this.tag);
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
  reverseTotal() {
    return this.credit - this.debit;
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
    if (!this.account) return undefined;
    let accountMainGroup = this.account.charAt(1);
    if (accountMainGroup === '0') accountMainGroup = this.account.charAt(2); // Techncal account
    switch (accountMainGroup) {
      case '1':
      case '2':
      case '3': return this.debit - this.credit;
      case '4': return this.credit - this.debit;
      case '5':
      case '6':
      case '7':
      case '8': return this.debit;
      case '9': return this.credit;
      default: productionAssert(false); return undefined;
    }
  },
  toJournalEntry() {
    const je = {
      txId: 'opening', // Minimongo indexing cannot handle null or undefined 
      tx: () => ({ category: 'opening', serialId: __('Opening balance'),/* defId: Txdefs.getByName('Opening', this.communityId), amount: this.amount,*/ }),
      valueDate: Period.fromTag(this.tag).beginDate(),
      account: this.account, // Accounts.getByName('Opening account', this.communityId),
      partner: this.partner,
      localizer: this.localizer,
    };
    if (this.debit > this.credit) {
      je.side = 'debit';
      je.amount = this.debit - this.credit;
    } else {
      je.side = 'credit';
      je.amount = this.credit - this.debit;
    }
    return JournalEntries._transform(je);
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
  return Balances._transform(_.extend({ debit: 0, credit: 0 }, def));
};

Balances.add = function add(bal1, bal2) {
  debugAssert(bal1.communityId === bal2.communityId);
  const debit = bal1.debit + bal2.debit;
  const credit = bal1.credit + bal2.credit;
  return _.extend({}, bal1, { debit, credit });
};

Balances.get = function get(def, balanceType) {
//  console.log("Lookin for Balance", def, balanceType);
  Balances.defSchema.validate(def);
  const defPeriod = Period.fromTag(def.tag);
  const accountingPeriods = AccountingPeriods.findOne({ communityId: def.communityId });
  if (!balanceType) balanceType = getTypeOfTag(def.tag);
  const _def = _.extend(def, { tag: setTypeOfTag(def.tag, balanceType) });
  if (balanceType === 'T') {
    const result = Balances._aggregateSubResults(_def);
//    console.log('T result:', result);
    return result;
  } else if (balanceType === 'O') {
    if (defPeriod.type() === 'entire') return Balances.nullValue(_def);
    const prevPeriod = accountingPeriods.previous(defPeriod);
    if (!prevPeriod) return Balances.nullValue(_def);
//    else console.log("Prev period is", prevPeriod, 'Closed:', accountingPeriods.isClosed(prevPeriod));
    if (prevPeriod.type() === 'year' && accountingPeriods.isClosed(prevPeriod)) { // O balances should exist then, because the closing creates them
      const thisYearPeriod = prevPeriod.next();
      const result = Balances._aggregateSubResults(_.extend({}, _def, { tag: 'O-' + thisYearPeriod.label }));
//      console.log('O result:', result);
      return result;
    } else {
      const prevTagDef = _.extend({}, def, { tag: prevPeriod.toTag() });
      return Balances.get(prevTagDef, 'C');
    }
  } else if (balanceType === 'C') {
    if (defPeriod.type() === 'entire') return Balances.get(def, 'T');  // Entire period closing C is the same as entire traffic T;
    const hasUploadedCBals = Balances.findOne(subdefSelector(_def));
//    console.log("Has uploaded C balances:", hasUploadedCBals);
    if (hasUploadedCBals) return Balances._aggregateSubResults(_def);
//    if (def.partner) debugAssert(defPeriod.endsOnYearEnd(), 'closing partner balance works only for end of year');
    /*if (defPeriod.endsOnYearEnd() && accountingPeriods.isClosed(defPeriod)) {
      const nextPeriod = accountingPeriods.next(defPeriod);
      debugAssert(nextPeriod, 'A closed period should gave a next period'); // Because the closing should create it
      console.log("Next period is", nextPeriod);
      const nextTagDef = _.extend({}, def, { tag: nextPeriod.toTag() });
      return Balances.get(nextTagDef, 'O');
    } else {*/
//      console.log("Just adding current T and O");
      return Balances.add(Balances.get(def, 'T'), Balances.get(def, 'O'));
    //}
  } else {
    debugAssert(false, `Unknown balance type ${balanceType}`);
    return undefined;
  }
};

Balances._aggregateSubResults = function _aggregateSubResults(def) {
  let result = _.extend({ debit: 0, credit: 0 }, def);
  Balances.find(subdefSelector(def)).forEach((b) => {
//    console.log("Adding balance", b);
    result.debit += b.debit;
    result.credit += b.credit;
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
/*
Balances.increase = function increase(selector, side, amount) {
  Balances._increase(selector, side, amount);
  // Plus creating the next period opening values
  const period = Period.fromTag(selector.tag);
  if (period.type() === 'year') {
    const nextPeriod = period.next();
    const nextOSelector = _.extend({}, selector, { tag: 'O' + nextPeriod.toTag().substring(1) });
    Balances._increase(nextOSelector, side, amount);
  }
};
*/
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
  Transactions.find(selector).fetch().forEach((tx, index) => {
    if (index % 100 === 0) Log.info('Rebalanced txs', index);
    tx.updateBalances(+1);
  });
};
