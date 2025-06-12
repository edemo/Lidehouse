import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock, datePartOnly } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { allowedOptions, imageUpload, noUpdate } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Meters = new Mongo.Collection('meters');

Meters.readingSchema = new SimpleSchema({
  date: { type: Date, autoform: { defaultValue() { return Clock.currentDate(); }, readonly() { return !Meteor.userOrNull().hasPermission('meters.update') } } },
  value: { type: Number, decimal: true },
  photo: { type: String, optional: true, autoform: imageUpload() },
  approved: { type: Boolean, optional: true, autoform: { type: 'hidden' } },
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

Meters.idSet = [['communityId', 'identifier']];

Meteor.startup(function indexParcels() {
  Meters.ensureIndex({ communityId: 1, active: 1 });
  Meters.ensureIndex({ parcelId: 1 });
  Meters.ensureIndex({ identifier: 1 });
});

Meters.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
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
  lastReading(date) {
    debugAssert(this.readings.length >= 1, 'Meters should have at least an initial reading');
    if (!date) return _.last(this.readings);
    let lastReading;
    for (const r of this.readings) {
      if (r.date <= date) lastReading = r;
      else break;
    }
    productionAssert(lastReading, 'Meter has no reading before the date, looks like it did not exist at that time', { meter: this.toString(), date });
    return lastReading;
  },
  lastBilling() {
    if (!this.billings?.length) return this.startReading();
    return _.last(this.billings);
  },
  lastReadingDate() {
    return this.readings.length < 2 ? new Date(0) : this.lastReading().date;
    // The first reading is always the installation reading, so if it has 1 reading, it was never read
  },
  lastReadingColor() {
    if (this.readings.length < 2) return 'danger';
    const lastReadingDate = this.lastReading().date;
    const elapsedDays = moment().diff(moment(lastReadingDate), 'days');
    if (elapsedDays > 90) return 'warning';
    return '';
  },
  unbilledReadAmount() {
    const lastBilling = this.lastBilling();
    const lastReading = this.lastReading();
    return lastReading.value - lastBilling.value;
  },
  unbilledEstimatedAmount() {
    const lastBilling = this.lastBilling();
    const estimatedValue = this.getEstimatedValue();
    return estimatedValue - lastBilling.value;
  },
  getEstimatedValue(date = Clock.currentDate()) {
    let lastReading;      // The last reading before this date
    let lastReadingIndex;
    this.readings.forEach((r, i) => {
      if (r.date <= date) { lastReading = r; lastReadingIndex = i; }
    });
    productionAssert(lastReading, 'Cannot estimate before any reading data is available');
    if (this.readings.length > lastReadingIndex + 1) { // If there are readings after the estimation date
      const nextReading = this.readings[lastReadingIndex + 1];
      const proportion = moment(date).diff(moment(lastReading.date), 'days')
                        / moment(nextReading.date).diff(moment(lastReading.date), 'days');
      return lastReading.value + (nextReading.value - lastReading.value) * proportion;
    }
    // Else we are estimating after the very last reading
    if (lastReadingIndex === 0) return lastReading.value; // With only one initial reading, unable estimate consumption
    const previousReading = this.readings[lastReadingIndex - 1];
    const usageDays = moment(lastReading.date).diff(moment(previousReading.date), 'days');
    let estimatedConsumption;
    if (usageDays === 0) estimatedConsumption = 0;
    else {
      debugAssert(usageDays > 0, 'Reading dates have to monotonically increase');
      const usage = lastReading.value - previousReading.value;
      const elapsedDays = moment(date).diff(moment(lastReading.date), 'days');
      const daysAfterWhichWeEstimate = this.community().settings.enableMeterEstimationDays;
      if (elapsedDays <= daysAfterWhichWeEstimate || usage < 0) estimatedConsumption = 0;
      else estimatedConsumption = (usage / usageDays) * elapsedDays;
    }
    return lastReading.value + estimatedConsumption;
  },
  displayReading(reading) {
    return `${reading.value.toFixed(this.decimals)} (${moment.utc(reading.date).format('L')})`;
  },
  billlingDetails(currentBilling, lastBilling, lastReading) {
    let result = '';
    const lang = this.community().settings.language;
    result += '  ' + __('Last billed value', {}, lang) + ': ' + this.displayReading(lastBilling);
    result += '  ' + __('Currently billed value', {}, lang) + ': ' + this.displayReading(currentBilling);
    if (lastBilling.date < lastReading.date) {
      result += '  ' + __('Actual reading', {}, lang) + ': ' + this.displayReading(lastReading);
    } else {
      result += '  ' + __('Last reading', {}, lang) +  ': ' + this.displayReading(lastReading);
    }
    result += ' - ' + __('meter', {}, lang) +  ': ' + this.identifier;
    return result;
  },  
  toString() {
    return `${this.idenfitier}(${this.parcel()})`;
  },
});

Meters.attachSchema(Meters.schema);
Meters.attachBehaviour(ActivePeriod);
Meters.attachBehaviour(Timestamped);

Meters.registerReadingSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  identifier: { type: String, optional: true, autoform: { readonly: true } },
  service: { type: String, optional: true, autoform: { readonly: true } },
  reading: { type: Meters.readingSchema },
});

Meters.simpleSchema().i18n('schemaMeters');
Meters.registerReadingSchema.i18n('schemaMeters');
Meters.registerReadingSchema.i18n('schemaReadings');

// --- Factory ---

Factory.define('meter', Meters, {
  identifier: () => faker.random.alphaNumeric(),
  service: 'heating',
  uom: 'kW',
});
