import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import { Tracker } from 'meteor/tracker';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { FreeFields } from '/imports/api/behaviours/free-fields.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';

export const Meters = new Mongo.Collection('meters');

Meters.serviceValues = ['coldWater', 'hotWater', 'electricity', 'gas', 'heating', 'cooling'];

Meters.readingSchema = new SimpleSchema({
  date: { type: Date },
  reading: { type: Number },
});

Meters.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  service: { type: String, allowedValues: Meters.serviceValues, autoform: autoformOptions(Meters.serviceValues, 'schemaMeters.service.') },
  identifier: { type: String },
//  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  readings: { type: Array, optional: true },
  'readings.$': { type: Meters.readingSchema },
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
});

Meters.attachSchema(Meters.schema);
Meters.attachBehaviour(ActivePeriod);
Meters.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Meters.simpleSchema().i18n('schemaMeters');
});

// --- Factory ---

Factory.define('meter', Meters, {
  communityId: () => Factory.get('community'),
});
