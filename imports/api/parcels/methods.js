import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from './parcels.js';
import { Memberships } from '../memberships/memberships.js';
import { crudBatchOps } from '../batch-method.js';

function checkCommunityParcelsSanity(communityId, parcels) {
  if (Meteor.isClient) return;
  const community = Communities.findOne(communityId);
  let registeredUnits = 0;
  parcels.find({ communityId }).forEach(p => registeredUnits += p.units);
  if (registeredUnits > community.totalunits) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
    `Registered units: ${registeredUnits}, Total units: ${community.totalunits}`);
  }
}

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    const community = Communities.findOne(doc.communityId);
    if (doc.ref) {
      checkNotExists(Parcels, { communityId: doc.communityId, ref: doc.ref });
      const format = community.parcelRefFormat;
      if (format) doc = extractFieldsFromRef(format, doc);
    }
    if (!doc.approved) {
      // Nothing to check. Things will be checked when it gets approved by community admin/manager.
    } else {
      checkPermissions(this.userId, 'parcels.insert', doc.communityId);
    }

    const ParcelsStage = Parcels.Stage();
    const _id = ParcelsStage.insert(doc);
    checkCommunityParcelsSanity(doc.communityId, ParcelsStage);
    ParcelsStage.commit();

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

    const ParcelsStage = Parcels.Stage();
    const result = ParcelsStage.update({ _id }, modifier);
    checkCommunityParcelsSanity(doc.communityId, ParcelsStage);
    ParcelsStage.commit();

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
    const activeOwners = Memberships.findActive({ parcelId: _id, role: 'owner' });
    if (activeOwners.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Parcel cannot be deleted while it has active owners',
       `Found: {${activeOwners.count()}}`);
    }
    Parcels.remove(_id);
    Memberships.remove({ parcelId: _id });
  },
});

Parcels.methods = Parcels.methods || {};
_.extend(Parcels.methods, { insert, update, remove });
_.extend(Parcels.methods, crudBatchOps(Parcels));
