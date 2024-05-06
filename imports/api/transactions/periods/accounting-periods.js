import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';

import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns, BreakdownsHelpers } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Period } from './period.js';

export const AccountingPeriods = new Mongo.Collection('accountingPeriods');

AccountingPeriods.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  years: { type: [String], defaultValue: [] },
  accountingClosedAt: { type: Date, optional: true },
});

AccountingPeriods.attachSchema(AccountingPeriods.schema);

// AccountingPeriods.simpleSchema().i18n('schemaPeriods');

Meteor.startup(function indexPeriods() {
  if (Meteor.isServer) {
    AccountingPeriods._ensureIndex({ communityId: 1 });
  }
});

// -------------------------------------

export const monthTags = {
  name: 'months',
  children: [
    { digit: '-01', name: '01', label: 'JAN' },
    { digit: '-02', name: '02', label: 'FEB' },
    { digit: '-03', name: '03', label: 'MAR' },
    { digit: '-04', name: '04', label: 'APR' },
    { digit: '-05', name: '05', label: 'MAY' },
    { digit: '-06', name: '06', label: 'JUN' },
    { digit: '-07', name: '07', label: 'JUL' },
    { digit: '-08', name: '08', label: 'AUG' },
    { digit: '-09', name: '09', label: 'SEP' },
    { digit: '-10', name: '10', label: 'OCT' },
    { digit: '-11', name: '11', label: 'NOV' },
    { digit: '-12', name: '12', label: 'DEC' },
  ],
};

const yearTags = function yearTags(years) {
  const result = { name: 'years', children: [] };
  years.forEach(year => {
    result.children.push({ digit: '-' + year, name: year, include: monthTags });
  });
  return result;
};

const periodTags = function periodTags(years) {
  return { digit: 'T', name: 'Total', include: yearTags(years) };
};

// -------------------------------------

AccountingPeriods.helpers({
  breakdown() {
    const tags = periodTags(this.years);
    return Breakdowns._transform(tags);
  },
  currentYearMonths() {
    const now =  Clock.currentTime();
    return this.fullYearMonths(now.getFullYear());
  },
  fullYearMonths(year) {
    return this.leafsOf(`T-${year}`).map(l => l.code);
  },
  isClosed(period) {
//    debugAssert(period.type() === 'year'); // We only close the years
    return this.accountingClosedAt && (period.endDate().getTime() <= this.accountingClosedAt.getTime());
  },
  previous(period) {
    if (period.type() === 'entire') return undefined;
    const prevPeriod = period.previous();
    const prevType = prevPeriod.type();
    if (prevType === 'year') return this.years.includes(prevPeriod.year) ? prevPeriod : undefined;
    if (prevType === 'month') return prevPeriod;
    debugAssert(false); return undefined;
  },
  next(period) {
    if (period.type() === 'entire') return undefined;
    const nextPeriod = period.next();
    const nextType = nextPeriod.type();
    if (nextType === 'year') return this.years.includes(nextPeriod.year) ? nextPeriod : undefined;
    if (nextType === 'month') return nextPeriod;
    debugAssert(false); return undefined;
  },
});

AccountingPeriods.get = function get(communityId) {
  const doc = AccountingPeriods.findOne({ communityId });
  if (Meteor.isServer) debugAssert(doc, 'AccountingPeriods have to exist for all community, that is doing accounting');
  return doc;
};

/*
AccountingPeriods.allow({
  insert() { return false; },
  update() { return false; },
  remove() { return false; },
});
*/
