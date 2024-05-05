import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
// import { Transactions } from '/imports/api/transactions/transactions.js';
// import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period } from './period.js';
import { AccountingPeriods } from './accounting-periods.js';

// Current inetrface only allows to close the last year, and to open the next year
// In the future, it might be possible to close months also, and to reopen previous years, if accounting has to be done on them

export const open = new ValidatedMethod({
  name: 'accountingPeriods.open',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    tag: { type: String, optional: true },
  }).validator(),

  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc);
    const period = Period.fromTag(doc.tag || Period.currentYearTag());
    productionAssert(period.type() === 'year', 'You may only open full years');
//    checkNotExists(Balances, { communityId: doc.communityId, tag: doc.tag });

    const periodsDoc = AccountingPeriods.get(doc.communityId);
    const years = _.uniq(_.sortBy(periodsDoc.years.concat(period.year), y => y), true);
    let accountingClosedAt;
    if (periodsDoc.accountingClosedAt && period.endDate().getFullYear() === periodsDoc.accountingClosedAt.getFullYear()) {
//      console.log('prev.endDate()', period.previous().endDate());
      accountingClosedAt = period.previous().endDate();
    }
    return AccountingPeriods.update(periodsDoc._id, { $set: { years, accountingClosedAt } });
  },
});

export const close = new ValidatedMethod({
  name: 'accountingPeriods.close',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    tag: { type: String, optional: true },
}).validator(),

  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc);
    const periodsDoc = checkExists(AccountingPeriods, { communityId: doc.communityId });
    const period = Period.fromTag(doc.tag || Period.currentYearTag());
    productionAssert(period.type() === 'year', 'You may only close full years');
    const nextPeriod = period.next();
//    checkConstraint(period.year == moment(Clock.currentTime()).year() - 1, 'You may  only close the last full year'); //  { got: period.year, expected: moment(Clock.currentTime()).year() - 1 }
    const closingDate = moment.utc(period.end());
    const needsClosingDate = periodsDoc.accountingClosedAt ? moment.utc(periodsDoc.accountingClosedAt).add(1, 'year') : moment.utc(periodsDoc.years[0], 'YYYY').endOf('year');
//    if (periodsDoc.accountingClosedAt && closingDate.valueOf() <= moment.utc(periodsDoc.accountingClosedAt).valueOf()) {
//      throw new Meteor.Error('err_notAllowed', 'Period already closed', { closingDate, accountingClosedAt: periodsDoc.accountingClosedAt });
//    }
    if (closingDate.format('YYYY-MM-DD') !== needsClosingDate.format('YYYY-MM-DD')) {
      throw new Meteor.Error('err_notAllowed', `Period ${needsClosingDate} before has to be closed first`, { closingDate, accountingClosedAt: periodsDoc.accountingClosedAt });
    }
    // --- Creating the opening transaction for the next period ---
    Balances.remove({ tag: `O-${nextPeriod.year}` });
    const tBals = Balances.find({ communityId: doc.communityId, tag: doc.tag }).fetch();
    const oBals = Balances.find({ communityId: doc.communityId, tag: 'O' + doc.tag.substr(1) }).fetch();
//    console.log('oBals', oBals);
//    console.log('tBals', tBals);
    oBals.forEach(oBal => {
      const balDef = {
        communityId: oBal.communityId,
        account: oBal.account,
        partner: oBal.partner,
        localizer: oBal.localizer,
        tag: 'T' + oBal.tag.substring(1),
      };
      const tBal = Balances.findOne(balDef);
      if (tBal) {
        oBal.debit += tBal.debit;
        oBal.credit += tBal.credit;
        const found =  _.findWhere(tBals, balDef);
        debugAssert(found);
        found.done = true;
      }
    });
    tBals.forEach(tBal => {
      if (tBal.done) return;
      delete tBal._id;
      const oBal = _.extend({}, tBal, { tag: 'O' + doc.tag.substring(1) });
      oBals.push(oBal);
    }); // At this point oBals contain (oBals + tBals)
  //  console.log('oBals + tBals', oBals);
    ['normal', 'technical'].forEach(NoT => {
      let openingAccountCode = Accounts.getByName('Opening account').code;
      if (NoT === 'technical') openingAccountCode = Accounts.toTechnicalCode(openingAccountCode);
      const debitOpen = [];
      const creditOpen = [];
      let debitOpenAmount = 0;
      let creditOpenAmount = 0;
      const nextYearOBals = [];
      oBals.forEach(oBal => {
        if (NoT === 'normal' && Accounts.isTechnicalCode(oBal.account)) return;
        if (NoT === 'technical' && !Accounts.isTechnicalCode(oBal.account)) return;
        const normalAccount = (NoT === 'normal') ? oBal.account : Accounts.fromTechnicalCode(oBal.account);
        if (!Accounts.isCarriedOver(normalAccount, oBal.communityId)) return;
        // if (oBal.account === openingAccount) return; // redundant, the isCarriedover is false for the opening account
        if (!oBal.partner && !oBal.localizer) {   // Only the one dimensional Balances will be connected to an Opening tx
          if (oBal.debitTotal()) {
            debitOpen.push({ account: oBal.account, amount: oBal.debitTotal() });
            debitOpenAmount += oBal.debitTotal();
          } else if (oBal.creditTotal()) {
            creditOpen.push({ account: oBal.account, amount: oBal.creditTotal() });
            creditOpenAmount += oBal.creditTotal();
          }
        }
        const nextOBal = _.extend({}, oBal, {
          tag: `O-${nextPeriod.year}`,
          debit: oBal.debitTotal(),
          credit: oBal.creditTotal(),
        });
        delete nextOBal._id;
//        Log.debug('nextOBal', nextOBal);
        nextYearOBals.push(nextOBal);
      });
      /* Creating the Opening Tx ----------------------------- not needed
      const openingDate =  closingDate.clone().add(1, 'day');
      const valueDate = openingDate.toDate();
      console.log('valueDate', valueDate);
      console.log('selector', { communityId: doc.communityId, category: 'opening', valueDate });
      const opResult = Transactions.remove({ communityId: doc.communityId, category: 'opening', valueDate: { $gte: closingDate.toDate(), $lte: openingDate.clone().add(1, 'day').toDate() } });
      console.log('removed', opResult);
      const openingTx = {
        communityId: doc.communityId,
        category: 'opening',
        generated: true,    // so it does not trigger Balance updates
        defId: Txdefs.getByName('Opening', doc.communityId)._id,
        valueDate,
        amount: debitOpenAmount + creditOpenAmount,
        debit: debitOpen,
        credit: creditOpen,
      };
      const openingTxId = Transactions.methods.insert._execute({ userId: this.userId }, openingTx);
      console.log('inserted');
      Transactions.methods.post._execute({ userId: this.userId }, { _id: openingTxId }); // Need to post, to create the oppposite side journal entries
      //console.log('tx', Transactions.findOne(openingTxId)); */
  //    console.log('nextYearOBals', nextYearOBals);
      nextYearOBals.forEach(bal => Balances.insert(bal));  // We cannot calculate back the correct opening Tx, that would result in the correct two dimensional Balance structure
      Balances.insert({
        communityId: doc.communityId,
        account: openingAccountCode,
        tag: `O-${nextPeriod.year}`,
        debit: creditOpenAmount,
        credit: debitOpenAmount,
      });
    });
//    console.log('Balances.find', Balances.find({ tag: new RegExp('^O') }).fetch());
    // --- ---
//    AccountingPeriods.methods.open._execute({ userId: this.userId }, { communityId: doc.communityId, tag: nextPeriod.toTag() });
    return AccountingPeriods.update(periodsDoc._id, { $set: { accountingClosedAt: closingDate.toDate() } });
  },
});

AccountingPeriods.methods = AccountingPeriods.methods || {};
_.extend(AccountingPeriods.methods, { open, close });
