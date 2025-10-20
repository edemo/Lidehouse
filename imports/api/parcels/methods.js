import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkUnique, checkModifier, checkPermissions, checkConstraint } from '/imports/api/method-checks.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { Localizer } from '/imports/api/accounting/breakdowns/localizer.js';
import { ParcelRefFormat } from '/imports/api/communities/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Parcels } from './parcels.js';

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: doc => Parcels.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    const community = Communities.findOne(doc.communityId);
    if (doc.category === '%property') {
      if (_.isUndefined(doc.serial)) doc.serial = community.nextAvailableSerial();
      if (doc.ref === 'auto') doc.ref = doc.serial;
    } else if (doc.category === '@property') {
      if (_.isUndefined(doc.serial)) doc.serial = community.nextAvailableSerial();
      if (doc.ref === 'auto') doc.ref = 'A' + doc.serial.toString().padStart(3, '0');
    }
    if (doc.ref && community.settings.parcelRefFormat) {
      doc = ParcelRefFormat.extractFieldsFromRef(community.settings.parcelRefFormat, doc);
    }
    checkUnique(Parcels, doc);
    if (!doc.approved) {
      // Nothing to check. Things will be checked when it gets approved by community admin/manager.
      if (!community.needsJoinApproval()) doc.approved = true;
    } else {
      checkPermissions(this.userId, 'parcels.insert', doc);
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
    let doc = checkExists(Parcels, _id);
    if (modifier.$set?.communityId && modifier.$set.communityId !== doc.communityId) { // Editing a template entry
      const community = Communities.findOne(modifier.$set.communityId);
      checkConstraint(community.settings.templateId === doc.communityId, 'You can update only from your own template');
      checkPermissions(this.userId, 'parcels.update', { communityId: modifier.$set.communityId });
      const clonedDocId = Parcels.clone(doc, modifier.$set.communityId);
      doc = Parcels.findOne(clonedDocId);
    }
    checkModifier(doc, modifier, ['communityId'], true);
    checkPermissions(this.userId, 'parcels.update', doc);

    const ParcelsStage = Parcels.Stage();
    const result = ParcelsStage.update({ _id: doc._id }, modifier, { selector: doc });
    const newDoc = ParcelsStage.findOne(doc._id);
    checkUnique(ParcelsStage, newDoc);
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
    const localizer = doc.code || Localizer.parcelRef2code(doc.ref);
    const balance = Balances.findOne({ communityId: doc.communityId, localizer });
    if (balance) {
      throw new Meteor.Error('err_unableToRemove', 'Parcel cannot be deleted if it has financial balances', `Balance: ${balance}`);
    }
    const activeOwners = Memberships.findActive({ parcelId: _id, role: 'owner' });
    if (activeOwners.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Parcel cannot be deleted while it has active owners',`Found: {${activeOwners.count()}}`);
    }
    Parcels.remove(_id);
    Memberships.remove({ parcelId: _id });
  },
});

Parcels.methods = Parcels.methods || {};
_.extend(Parcels.methods, { insert, update, remove });
_.extend(Parcels.methods, crudBatchOps(Parcels));
