import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Clock, datePartOnly } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { allowedOptions, imageUpload, noUpdate } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';

export const Meters = new Mongo.Collection('meters');

Meters.readingSchema = new SimpleSchema({
  date: { type: Date, autoform: { defaultValue() { return Clock.currentDate(); } } },
  value: { type: Number, decimal: true },
  photo: { type: String, optional: true, autoform: imageUpload() },
  approved: { type: Boolean, optional: true, autoform: { omit: true }, defaultValue: true },
});

Meters.unapprovedReadingSchema = new SimpleSchema({
  date: { type: Date, autoValue() { return Clock.currentDate(); }, autoform: { defaultValue() { return Clock.currentDate(); }, readonly: true } },
  value: { type: Number, decimal: true },
  photo: { type: String, optional: true, autoform: imageUpload() },
});

// Meters.billingTypeValues = ['reading', 'estimate'];
Meters.billingSchema = new SimpleSchema({
  date: { type: Date },
  value: { type: Number, decimal: true },
//  type: { type: String, allowedValues: Meters.billingTypeValues, autoform: allowedOptions() },
//  readingId: { type: Number },   // pointer // if not present, it is an estimation
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

Meters.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  identifier: { type: String },
  service: { type: String, max: 25 },
  uom: { type: String, max: 15 },
  decimals: { type: Number, defaultValue: 3, max: 10, autoform: { autoValue: 3 } }, // how many decimals the readings accept and display
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  readings: { type: Array, optional: true, autoValue() {
    if (this.isInsert && !this.isSet) {
      const date = this.field('activeTime.begin').value || Clock.currentDate();
      const value = 0;
      return [{ date, value, approved: this.field('approved').value }];
    } return undefined;
  } },
  'readings.$': { type: Meters.readingSchema },
  billings: { type: Array, optional: true, autoform: { omit: true } },
  'billings.$': { type: Meters.billingSchema },
});

Meters.idSet = ['communityId', 'identifier'];

Meteor.startup(function indexParcels() {
  Meters.ensureIndex({ communityId: 1 });
  Meters.ensureIndex({ parcelId: 1 });
  Meters.ensureIndex({ identifier: 1 });
});

Meters.helpers({
  parcel() {
    const Parcels = Mongo.Collection.get('parcels');
    return Parcels.findOne(this.parcelId);
  },
  entityName() {
    return 'meters';
  },
  startReading() {
    return _.first(this.readings);
  },
  lastReading() {
    return _.last(this.readings);
  },
  lastBilling() {
    if (!this.billings || !this.billings.length) return this.startReading();
    return _.last(this.billings);
  },
  lastReadingColor() {
    const lastReadingDate = this.lastReading().date;
    if (!lastReadingDate) return 'danger';
    const elapsedDays = moment().diff(moment(lastReadingDate), 'days');
    if (elapsedDays > 90) return 'warning';
    return '';
  },
  getEstimatedConsumptionSinceLastReading(date = Clock.currentDate()) {
    const length = this.readings.length;
    debugAssert(length >= 1, 'Meters should have at least an initial reading');
    const lastReading = this.readings[length - 1];
    debugAssert(lastReading.date <= date, 'We dont support estimating in between reading values');
    if (length === 1) return lastReading.value; // With only one initial reading, unable estimate consumption
    const previousReading = this.readings[length - 2];
    const usageDays = moment(lastReading.date).diff(moment(previousReading.date), 'days');
    if (usageDays === 0) return 0;
    debugAssert(usageDays > 0, 'No negative days between reading');
    const usage = lastReading.value - previousReading.value;
    const elapsedDays = moment(date).diff(moment(lastReading.date), 'days');
    const estimate = (usage / usageDays) * elapsedDays;
    return estimate;
  },
  getEstimatedValue(date = Clock.currentDate()) {
    return this.lastReading().value + this.getEstimatedConsumptionSinceLastReading(date);
  },
});

Meters.attachSchema(Meters.schema);
Meters.attachBehaviour(ActivePeriod);
Meters.attachBehaviour(Timestamped);

Meters.registerReadingSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  reading: { type: Meters.unapprovedReadingSchema },
});

Meters.simpleSchema().i18n('schemaMeters');
Meters.registerReadingSchema.i18n('schemaReadings');

// --- Factory ---

Factory.define('meter', Meters, {
  identifier: () => faker.random.alphaNumeric(),
  service: 'heating',
  uom: 'kW',
});
