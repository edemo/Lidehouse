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
import { MeterReadings } from './meter-readings/meter-readings.js';

export const Meters = new Mongo.Collection('meters');

Meters.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden', relation: 'property' } },
  identifier: { type: String },
  service: { type: String, max: 25 },
  uom: { type: String, max: 15 },
  decimals: { type: Number, defaultValue: 3, max: 10, autoform: { autoValue: 3 } }, // how many decimals the readings accept and display
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  readings: { type: [Object], optional: true, autoform: { omit: true } },  // deprecated
  billings: { type: [Object], optional: true, autoform: { omit: true } },  // deprecated
  // cached values:
  _lastReading: { type: MeterReadings.readingSchema, optional: true, autoform: { omit: true } },  
  _lastBilling: { type: MeterReadings.readingSchema, optional: true, autoform: { omit: true } },
});

Meters.idSet = [['communityId', 'identifier', 'service']];

Meteor.startup(function indexMeters() {
  Meters.ensureIndex({ communityId: 1, identifier: 1, service: 1 });
  Meters.ensureIndex({ communityId: 1, active: 1 });
  Meters.ensureIndex({ parcelId: 1 });
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
  getReadings() {
    return MeterReadings.find({ meterId: this._id, type: 'reading' }, { sort: { date: 1 } });
  },
  getBillings() {
    return MeterReadings.find({ meterId: this._id, type: 'estimate' }, { sort: { date: 1 } });
  },
  startReading() {
    const result = MeterReadings.findOne({ meterId: this._id, type: 'reading' }, { sort: { date: 1 } });
    debugAssert(result, 'Meters should have at least an initial reading', this);
    return MeterReadings.convertToReadingSchema(result);
  },
  calculateLastReading() {  
    // Do not use the cache here - for purposes of calculating the cached value itself
    const result = MeterReadings.findOne({ meterId: this._id, type: 'reading'}, { sort: { date: -1, createdAt: -1 } });
    return result && MeterReadings.convertToReadingSchema(result);
  },
  lastReading(date) {
    debugAssert(this._lastReading, 'Meters should have at least an initial reading', this);
    if (!date) return this._lastReading;
    let result;
    for (const r of this.getReadings().fetch()) {
      if (r.date <= date) result = r;
      else break;
    }
    productionAssert(result, 'Meter has no reading before the date, looks like it did not exist at that time', { meter: this.toString(), date });
    return result;
  },
  lastBilling() {
    return this._lastBilling || this.startReading();
  },
  lastReadingDate() {
    return this.getReadings().count < 2 ? new Date(0) : this.lastReading().date;
    // The first reading is always the installation reading, so if it has 1 reading, it was never read
  },
  lastReadingColor() {
    if (this.getReadings().count < 2) return 'danger';
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
    const readings = this.getReadings().fetch();
    readings.forEach((r, i) => {
      if (r.date <= date) { lastReading = r; lastReadingIndex = i; }
    });
    productionAssert(lastReading, 'Cannot estimate before any reading data is available');
    if (readings.length > lastReadingIndex + 1) { // If there are readings after the estimation date
      const nextReading = readings[lastReadingIndex + 1];
      const proportion = moment(date).diff(moment(lastReading.date), 'days')
                        / moment(nextReading.date).diff(moment(lastReading.date), 'days');
      return lastReading.value + (nextReading.value - lastReading.value) * proportion;
    }
    // Else we are estimating after the very last reading
    if (lastReadingIndex === 0) return lastReading.value; // With only one initial reading, unable estimate consumption
    const previousReading = readings[lastReadingIndex - 1];
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

Meters.simpleSchema().i18n('schemaMeters');

//-----------------------------------------------------------------------------

// --- Before/after actions ---

if (Meteor.isServer) {
  Meters.before.insert(function (userId, doc) {
    const date = doc.activeTime?.begin || Clock.currentDate();
    const value = 0;
    doc._lastBilling =  { date, value };
  });

  Meters.after.insert(function (userId, doc) {
    const date = doc.activeTime?.begin || Clock.currentDate();
    const value = 0;
    Meters.methods.registerReading._execute({ userId }, { _id: doc._id, reading: { date, value, approved: doc.aproved } });  
  });
}

// --- Factory ---

Factory.define('meter', Meters, {
  identifier: () => faker.random.alphaNumeric(),
  service: 'heating',
  uom: 'kW',
});
