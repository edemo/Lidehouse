import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from '/imports/api/communities/communities.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Parcels } from './parcels.js';
import { Memberships } from '../memberships/memberships.js';
import { checkNotExists } from '../method-checks';

function checkCommunityParcelsSanity(communityId) {
  const community = Communities.findOne(communityId);
  const registeredUnits = community.registeredUnits();
  if (registeredUnits > community.totalunits) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
    `Registered units: ${registeredUnits}, Total units: ${community.totalunits}`);
  }
}

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (doc.ref) checkNotExists(Parcels, { communityId: doc.communityId, ref: doc.ref });
    if (!doc.approved) {
      // Nothing to check. Things will be checked when it gets approved by community admin/manager.
    } else {
      checkPermissions(this.userId, 'parcels.insert', doc.communityId);
    }

    // Try the operation, and if it produces an insane state, revert it
    const _id = Parcels.insert(doc);
    try {
      checkCommunityParcelsSanity(doc.communityId);
    } catch (err) {
      Parcels.remove(_id);
      throw err;
    }
    return _id;
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
    checkNotExists(Parcels, { _id: { $ne: doc._id }, communityId: doc.communityId, ref: modifier.$set.ref });
    checkPermissions(this.userId, 'parcels.update', doc.communityId);

    // Try the operation, and if it produces an insane state, revert it
    const result = Parcels.update({ _id }, modifier);
    try {
      checkCommunityParcelsSanity(doc.communityId);
    } catch (err) {
      Parcels.update({ _id }, { $set: doc });
      throw err;
    }
    return result;
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
    const activeOwners = Memberships.find({ parcelId: _id, role: 'owner', active: true });
    if (activeOwners.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Parcel cannot be deleted while it has active owners',
       `Found: {${activeOwners.count()}}`);
    }
    Parcels.remove(_id);
    Memberships.remove({ parcelId: _id });
  },
});

Parcels.methods = {
  insert, update, remove,
};
