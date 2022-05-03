import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
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
//    checkConstraint(period.year == moment(Clock.currentTime()).year(), 'You may only open the current full year');  //  { got: period.year, expected: moment(Clock.currentTime()).year() }
//    checkNotExists(Balances, { communityId: doc.communityId, tag: doc.tag });

    const periodsDoc = AccountingPeriods.get(doc.communityId);
    const years = _.uniq(_.sortBy(periodsDoc.years.concat(period.year), y => y), true);
    AccountingPeriods.update(periodsDoc._id, { $set: { years } });
  },
});

export const close = new ValidatedMethod({
  name: 'accountingPeriods.close',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    tag: { type: String },
}).validator(),

  run(doc) {
    const periodsDoc = checkExists(AccountingPeriods, { communityId: doc.communityId });
    checkPermissions(this.userId, 'transactions.insert', doc);
//    checkConstraint(doc.account === '`', 'Not allowed to close a subset of the accounts');
//    checkConstraint(doc.partner === undefined && doc.localizer === undefined);
    const period = Period.fromTag(doc.tag);
    productionAssert(period.type() === 'year', 'You may only close full years');
//    checkConstraint(period.year == moment(Clock.currentTime()).year() - 1, 'You may  only close the last full year'); //  { got: period.year, expected: moment(Clock.currentTime()).year() - 1 }
    const closingDate = moment().subtract(1, 'year').endOf('year').toDate();
    if (periodsDoc.accountingClosedAt && closingDate.getTime() <= periodsDoc.accountingClosedAt.getTime()) {
      throw new Meteor.Error('err_notAllowed', 'Period already closed', { closingDate, accountingClosedAt: periodsDoc.accountingClosedAt });
    }
    AccountingPeriods.update(periodsDoc._id, { $set: { accountingClosedAt: closingDate } });
  },
});

AccountingPeriods.methods = AccountingPeriods.methods || {};
_.extend(AccountingPeriods.methods, { open, close });
