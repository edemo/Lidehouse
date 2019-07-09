import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from './parcels.js';
import { Memberships } from '../memberships/memberships.js';

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
      const total = community.registeredUnits();
      const newTotal = total + doc.units;
      const totalunits = community.totalunits;
      if (newTotal > totalunits) {
        throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
        `Registered units: ${total}/${totalunits}, With new unit: ${newTotal}/${totalunits}`);
      }
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
    checkNotExists(Parcels, { _id: { $ne: doc._id }, communityId: doc.communityId, ref: modifier.$set.ref });
    checkPermissions(this.userId, 'parcels.update', doc.communityId);
    const community = Communities.findOne(doc.communityId);
    const total = community.registeredUnits();
    const newTotal = (total - doc.units) + modifier.$set.units;
    const totalunits = community.totalunits;
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
    const activeOwners = Memberships.find({ parcelId: _id, role: 'owner', active: true });
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
