import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier } from '../method-checks.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { sendOutstandingsEmail } from '/imports/email/outstandings-send.js';

function leadParcelCheck(collection, doc) {
  if (doc.leadParcelId) {
    if (doc.leadParcelId === doc.parcelId) throw new Meteor.Error('err_sanityCheckFailed', 'Lead parcel cannot be led');
    const ledContracts = collection.find(
      { $or: [
        { parcelId: doc.leadParcelId, leadParcelId: { $exists: true } },
        { leadParcelId: doc.parcelId },
        { _id: doc._id },
      ] }, { sort: { 'activeTime.end': 1 } },
    );
    ledContracts.forEach((contract, i) => {
      if (!ledContracts[i + 1]) return;
      if (contract.getActiveTime().end > ledContracts[i + 1].getActiveTime().begin) {
        throw new Meteor.Error('err_sanityCheckFailed', 'Lead parcel cannot be led');
      }
    });
  }
}

export const insert = new ValidatedMethod({
  name: 'contracts.insert',
  validate: doc => Contracts.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    checkPermissions(this.userId, 'contracts.insert', doc);

    const ContractsStage = Contracts.Stage();
    const _id = ContractsStage.insert(doc);
    if (doc.relation === 'member' && doc.parcelId) {
      sanityCheckOnlyOneActiveAtAllTimes(ContractsStage, { parcelId: doc.parcelId });
      leadParcelCheck(ContractsStage, ContractsStage.findOne(_id));
    }
    ContractsStage.commit();

    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'contracts.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Contracts, _id);
    checkModifier(doc, modifier, Contracts.modifiableFields.concat('approved'));
    checkPermissions(this.userId, 'contracts.update', doc);

    const ContractsStage = Contracts.Stage();
    const result = ContractsStage.update(_id, modifier, { selector: doc });
    const newDoc = ContractsStage.findOne(_id);
    if (doc.relation === 'member' && newDoc.parcelId) {
      sanityCheckOnlyOneActiveAtAllTimes(ContractsStage, { parcelId: newDoc.parcelId });
      leadParcelCheck(ContractsStage, newDoc);
    }
    ContractsStage.commit();

    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'contracts.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Contracts, _id);
    checkPermissions(this.userId, 'contracts.remove', doc);
    const contractTag = `${doc.partnerId}/${doc._id}`;
    Balances.checkNullBalance({ communityId: doc.communityId, partner: contractTag, tag: 'T' });
    const worksheets = doc.worksheets();
    if (worksheets.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Contract cannot be deleted while it contains worksheets',
        `Found: {${worksheets.count()}}`);
    }
    Contracts.remove(_id);
  },
});

export const remindOutstandings = new ValidatedMethod({
  name: 'contracts.remindOutstandings',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Contracts, _id);
    checkPermissions(this.userId, 'transactions.post', doc);
    if (Meteor.isServer) {
      if (sendOutstandingsEmail(_id) === false) throw new Meteor.Error('err_email');
    }
  },
});

Contracts.methods = Contracts.methods || {};
_.extend(Contracts.methods, { insert, update, remove, remindOutstandings });
_.extend(Contracts.methods, crudBatchOps(Contracts));
