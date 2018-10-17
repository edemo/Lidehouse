import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from '/imports/api/communities/communities.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Parcels } from './parcels.js';
import { Memberships } from '../memberships/memberships.js';
import { checkNotExists } from '../method-checks';

export const insertUnapproved = new ValidatedMethod({
  name: 'parcels.insert.unapproved',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    // This can be done without any permission check. Because its unapproved.
    if (doc.approved !== false) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to insert approved parcel', `doc: ${doc}`);
    }
    return Parcels.insert(doc);
  },
});

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (doc.serial) checkNotExists(Parcels, { communityId: doc.communityId, serial: doc.serial });
    checkPermissions(this.userId, 'parcels.insert', doc.communityId);
    const total = Communities.findOne({ _id: doc.communityId }).registeredUnits();
    const newTotal = total + doc.units;
    const totalunits = Communities.findOne({ _id: doc.communityId }).totalunits;
    if (newTotal > totalunits) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
      `Registered units: ${total}/${totalunits}, With new unit: ${newTotal}/${totalunits}`);
    }
    return Parcels.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'parcels.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Parcels, _id);
    checkModifier(doc, modifier, ['communityId'], true);
    checkNotExists(Parcels, { _id: { $ne: doc._id }, communityId: doc.communityId, serial: modifier.$set.serial });
    checkPermissions(this.userId, 'parcels.update', doc.communityId);
    const total = Communities.findOne({ _id: doc.communityId }).registeredUnits();
    const newTotal = (total - doc.units) + modifier.$set.units;
    const totalunits = Communities.findOne({ _id: doc.communityId }).totalunits;
    if (newTotal > totalunits) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
      `Registered units: ${total}/${totalunits}, With new unit: ${newTotal}/${totalunits}`);
    }
    Parcels.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'parcels.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Parcels, _id);
    checkPermissions(this.userId, 'parcels.remove', doc.communityId);

    Parcels.remove(_id);
    Memberships.remove({ parcelId: _id });
  },
});
