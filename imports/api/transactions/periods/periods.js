import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';

import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { replaceDotsInString } from '/imports/api/utils';
import { Breakdowns, BreakdownsHelpers } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Period } from './period.js';

export const Periods = new Mongo.Collection('periods');

Periods.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  years: { type: [String], defaultValue: [] },
  closedAt: { type: Date, optional: true },
});

Periods.attachSchema(Periods.schema);

// Periods.simpleSchema().i18n('schemaPeriods');

Meteor.startup(function indexPeriods() {
  if (Meteor.isServer) {
    Periods._ensureIndex({ communityId: 1 });
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

Periods.helpers({
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
});

Periods.get = function get(communityId) {
  const doc = Periods.findOne({ communityId });
  if (!doc) {
    const _id = Periods.insert({ communityId });
    return Periods.findOne(_id);
  }
  return doc;
};
Periods.getTags = function getTags(communityId) {
  const doc = Periods.get(communityId);
  return Breakdowns._transform(doc);
};

/*
Periods.allow({
  insert() { return false; },
  update() { return false; },
  remove() { return false; },
});
*/
