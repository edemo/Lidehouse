import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions, fileUpload, noUpdate } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';

export const Meters = new Mongo.Collection('meters');

Meters.serviceValues = ['coldWater', 'hotWater', 'electricity', 'gas', 'heating', 'cooling'];

Meters.readingSchema = new SimpleSchema({
  date: { type: Date },
  value: { type: Number },
  photo: { type: String, optional: true, autoform: fileUpload },
  approved: { type: Boolean, optional: true, autoform: { omit: true }, defaultValue: true },
});

Meters.unapprovedReadingSchema = new SimpleSchema({
  date: { type: Date, autoValue: () => new Date(), autoform: { value: new Date(), readonly: true } },
  value: { type: Number },
  photo: { type: String, optional: true, autoform: fileUpload },
});

Meters.billingTypeValues = ['reading', 'estimate'];
Meters.billingSchema = new SimpleSchema({
  date: { type: Date },
  value: { type: Number },
  type: { type: String, allowedValues: Meters.billingTypeValues, autoform: autoformOptions(Meters.billingTypeValues) },
//  readingId: { type: Number },   // pointer // if not present, it is an estimation
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

Meters.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  service: { type: String, allowedValues: Meters.serviceValues, autoform: autoformOptions(Meters.serviceValues, 'schemaMeters.service.') },
  identifier: { type: String },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  readings: { type: Array, optional: true },
  'readings.$': { type: Meters.readingSchema },
  billings: { type: Array, optional: true, autoform: { omit: true } },
  'billings.$': { type: Meters.billingSchema },
});

Meters.idSet = ['communityId', 'identifier'];

Meteor.startup(function indexParcels() {
  Meters.ensureIndex({ communityId: 1, parcelId: 1 });
  if (Meteor.isServer) {
//    Meters._ensureIndex({ identifier: 1 });
  }
});

Meters.helpers({
  permissionCategory() {
    return 'meters';
  },
  lastReading() {
    return _.last(this.readings);
  },
  lastBilling() {
    return _.last(this.billings);
  },
});

Meters.attachSchema(Meters.schema);
Meters.attachBehaviour(ActivePeriod);
Meters.attachBehaviour(Timestamped);

Meters.registerReadingSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  reading: { type: Meters.unapprovedReadingSchema },
});

Meteor.startup(function attach() {
  Meters.simpleSchema().i18n('schemaMeters');
  Meters.registerReadingSchema.i18n('schemaReadings');
});

if (Meteor.isServer) {
  Meters.before.insert(function (userId, doc) {
    if (!doc.readings) {
      doc.readings = [{
        date: (doc.activeTime && doc.activeTime.begin) || new Date(),
        value: 0,
      }];
    }
    if (!doc.billings) {
      doc.billings = [{
        date: (doc.activeTime && doc.activeTime.begin) || new Date(),
        value: 0,
      }];
    }
  });
}

// --- Factory ---

Factory.define('meter', Meters, {
  communityId: () => Factory.get('community'),
  identifier: () => faker.random.alphaNumeric(),
});
