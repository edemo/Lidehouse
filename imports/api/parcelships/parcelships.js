/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import { _ } from 'meteor/underscore';

import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Parcels, chooseProperty } from '/imports/api/parcels/parcels.js';

export const Parcelships = new Mongo.Collection('parcelships');

Parcelships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden', relation: '@property' } },
  leadParcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseProperty } },
  approved: { type: Boolean, defaultValue: true, autoform: { omit: true } },
});

Parcelships.idSet = ['parcelId'];

Meteor.startup(function indexParcelships() {
  Parcelships.ensureIndex({ parcelId: 1 });
  Parcelships.ensureIndex({ leadParcelId: 1 });
  if (Meteor.isServer) {
    Parcelships._ensureIndex({ communityId: 1 });
  }
});

Parcelships.helpers({
  leadParcel() {
    return Parcels.findOne(this.leadParcelId);
  },
  followerParcel() {
    return Parcels.findOne(this.parcelId);
  },
  entityName() {
    return 'parcelships';
  },
});

Parcelships.attachSchema(Parcelships.schema);
Parcelships.attachBehaviour(ActivePeriod);
Parcelships.attachBehaviour(Timestamped);

Parcelships.simpleSchema().i18n('schemaParcelships');

if (Meteor.isServer) {
  Parcelships.after.insert(function (userId, doc) {
    if (doc.active) Parcels.update(doc.parcelId, { $set: { leadRef: Parcels.findOne(doc.leadParcelId).ref } }, { selector: { category: '@property' } });
  });

  Parcelships.before.update(function (userId, doc, fieldNames, modifier, options) {
    if (doc.active) Parcels.update(doc.parcelId, { $unset: { leadRef: '' } }, { selector: { category: '@property' } });
  });

  Parcelships.after.update(function (userId, doc, fieldNames, modifier, options) {
    if (doc.active) Parcels.update(doc.parcelId, { $set: { leadRef: Parcels.findOne(doc.leadParcelId).ref } }, { selector: { category: '@property' } });
  });

  Parcelships.after.remove(function (userId, doc) {
    if (doc.active) Parcels.update(doc.parcelId, { $unset: { leadRef: '' } }, { selector: { category: '@property' } });
  });
}

Factory.define('parcelship', Parcelships, {
});

