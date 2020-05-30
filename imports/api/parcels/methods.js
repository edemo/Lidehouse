import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkUnique, checkModifier, checkPermissions, } from '/imports/api/method-checks.js';
import { checkNoOutstanding } from '/imports/api/behaviours/accounting-location.js';
import { ParcelRefFormat } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Parcels } from './parcels.js';

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
  validate: doc => Parcels.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    const community = Communities.findOne(doc.communityId);
    if (doc.category === '@property') {
      if (!doc.serial) doc.serial = community.nextAvailableSerial();
      if (doc.ref === 'auto') doc.ref = 'A' + doc.serial.toString().padStart(3, '0');
    }
    if (doc.ref) {
      doc = ParcelRefFormat.extractFieldsFromRef(community.settings.parcelRefFormat, doc);
    }
    checkUnique(Parcels, doc);
    if (!doc.approved) {
      // Nothing to check. Things will be checked when it gets approved by community admin/manager.
      if (!community.needsJoinApproval()) doc.approved = true;
    } else {
      checkPermissions(this.userId, 'parcels.insert', doc);
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
    checkPermissions(this.userId, 'parcels.update', doc);

    const ParcelsStage = Parcels.Stage();
    const result = ParcelsStage.update({ _id }, modifier, { selector: doc });
    const newDoc = Parcels.findOne(_id);
    checkUnique(ParcelsStage, newDoc);
    checkCommunityParcelsSanity(newDoc.communityId, ParcelsStage);
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
    checkPermissions(this.userId, 'parcels.remove', doc);
    checkNoOutstanding(doc);
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
