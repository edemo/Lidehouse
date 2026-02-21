import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Log } from '/imports/utils/log.js';
import { Clock, datePartOnly } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { allowedOptions, imageUpload, noUpdate } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';

export const MeterReadings = new Mongo.Collection('meterReadings');

MeterReadings.readingSchema = new SimpleSchema({
  date: { type: Date, autoform: { defaultValue() { return Clock.currentDate(); }, readonly() { return !Meteor.userOrNull().hasPermission('meters.update') } } },
  value: { type: Number, decimal: true },
  photo: { type: String, optional: true, autoform: imageUpload() },
  approved: { type: Boolean, optional: true },
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});
MeterReadings.convertToReadingSchema = ({ date, value, photo, approved, billId }) => ({ date, value, photo, approved, billId });
MeterReadings.readingSchema.i18n('schemaMeterReadings');

MeterReadings.schema = new SimpleSchema([{
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
    meterId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
    type: { type: String, allowedValues: ['reading', 'estimate'], defaultValue: 'reading', autoform: { type: 'hidden' } },
    // reading (type: reading) - Can be inserted by methods
    // billing (type: estimate, billId: { $exists: true }) - Automatically inserted at bill posting
  },
  MeterReadings.readingSchema,
]);

MeterReadings.idSet = [['communityId', 'meterId', 'type', 'date']];

Meteor.startup(function indexMeterReadings() {
  MeterReadings.ensureIndex({ communityId: 1 });
  MeterReadings.ensureIndex({ meterId: 1, date: 1, createdAt: 1 });
});

MeterReadings.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  meter() {
    const Meters = Mongo.Collection.get('meters');
    return Meters.findOne(this.meterId);
  },
  entityName() {
    return 'meterReadings';
  },
  displayType() {
    if (this.type === 'estimate' && this.billId) return 'billing';
    else if (this.type === 'reading' && this.approved) return 'approved';
    else if (this.type === 'reading' && !this.approved) return 'unapproved';
    else debugAssert(false);
  }
});

MeterReadings.attachSchema(MeterReadings.schema);
MeterReadings.attachBehaviour(Timestamped);

// ----------------------------------------------------------------------------

// This is the schema on the UI for entering a new reading
MeterReadings.registerReadingSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  // just for clarity on the UI - not used in the method processing
  identifier: { type: String, optional: true, autoform: { readonly: true } },   
  service: { type: String, optional: true, autoform: { readonly: true } },
  // - - -
  reading: { type: MeterReadings.readingSchema },
});

MeterReadings.registerReadingSchema.i18n('schemaMeters');

//-----------------------------------------------------------------------------

// --- Before/after actions ---

if (Meteor.isServer) {
  MeterReadings.after.insert(function (userId, doc) {
    const Meters = Mongo.Collection.get('meters');
    const meter = Meters.findOne(doc.meterId);
    if (doc.type === 'reading') 
      Meters.update(doc.meterId, { $set: { _lastReading: meter.calculateLastReading() } });
    else if (doc.type === 'estimate' && doc.billId)
      Meters.update(doc.meterId, { $set: { _lastBilling: MeterReadings.convertToReadingSchema(doc) } });
    else debugAssert(false);
//    if (!meter._lastReading || doc.date > meter._lastReading.date) {
//      Meters.update(doc.meterId, { $set: { _lastReading: doc } });
//    } else {
//      Log.warning('Retroactive meter reading', doc);
//    }
  });

  MeterReadings.after.update(function (userId, doc, fieldNames, modifier, options) {
    const Meters = Mongo.Collection.get('meters');
    const meter = Meters.findOne(doc.meterId);
    if (doc.type === 'reading') 
      Meters.update(doc.meterId, { $set: { _lastReading: meter.calculateLastReading() } });
    else if (doc.type === 'estimate' && doc.billId) 
      Meters.update(doc.meterId, { $set: { _lastBilling: MeterReadings.convertToReadingSchema(doc) } });
    else debugAssert(false);
  });

  MeterReadings.after.remove(function (userId, doc) {
    const Meters = Mongo.Collection.get('meters');
    const meter = Meters.findOne(doc.meterId);
    if (doc.type === 'reading'){
      const _lastReading = meter.calculateLastReading();
      if (_lastReading) Meters.update(doc.meterId, { $set: { _lastReading } });
      else Meters.update(doc.meterId, { $unset: { _lastReading: '' } });  
    }
  });
}

// --- Factory ---

Factory.define('meterReading', MeterReadings, {
});
