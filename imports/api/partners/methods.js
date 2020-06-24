import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { checkNoOutstanding } from '/imports/api/behaviours/accounting-location.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { sendOutstandingsEmail } from '/imports/email/outstandings-send.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Partners } from './partners.js';


export function userUnlinkNeeded(currentDoc, modifier) {
  if (currentDoc.userId) {
    const newDoc = rusdiff.clone(currentDoc);
    rusdiff.apply(newDoc, modifier);
    const oldEmail = currentDoc.contact?.email;
    const newEmail = newDoc.contact?.email;
    if (newEmail && newEmail !== oldEmail) {
      const currentUser = Meteor.users.findOne(currentDoc.userId);
      return !currentUser.hasThisEmail(newEmail);
    } else if (!newEmail && oldEmail) {
      return true;
    }
  }
  return false;
}

export const insert = new ValidatedMethod({
  name: 'partners.insert',
  validate: Partners.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Partners._transform(doc);
    checkPermissions(this.userId, 'partners.insert', doc);
    if (doc.contact && doc.contact.email) {
      const partner = Partners.findOne({ communityId: doc.communityId, 'contact.email': doc.contact.email });
      if (partner) throw new Meteor.Error('err_alreadyExists', `Partner with this email address already exists, you can select this person from the dropdown: ${partner.displayName()}`);
    }
    const _id = Partners.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'partners.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Partners, _id);
    checkModifier(doc, modifier, Partners.nonModifiableFields, true);
    checkPermissions(this.userId, 'partners.update', doc);
    const newContactEmail = modifier.$set?.['contact.email'];
    if (newContactEmail && newContactEmail !== doc.contact?.email) {
      const partner = Partners.findOne({ _id: { $ne: doc._id }, communityId: doc.communityId, 'contact.email': newContactEmail });
      if (partner) throw new Meteor.Error('err_alreadyExists', `Partner with this email address already exists: ${partner.displayName()}`);
    }
    if (Meteor.isServer && userUnlinkNeeded(doc, modifier)) {
      if (!modifier.$unset) modifier.$unset = {};
      modifier.$unset.userId = '';
      delete modifier.$set.userId;
    }
    const result = Partners.update({ _id }, modifier);
    return result;
  },
});

export const merge = new ValidatedMethod({
  name: 'partners.merge',
  validate: Partners.mergeSchema.validator(),

  run({ _id, destinationId }) {
    const doc = checkExists(Partners, _id);
    checkPermissions(this.userId, 'partners.update', doc);
    const destinationDoc = checkExists(Partners, destinationId);
    const $set = _.deepExtend({}, doc, destinationDoc);
    delete $set.relation;
    delete $set.outstanding;
    Mongo.Collection.stripAdministrativeFields($set);
    const modifier = {
      $set: _.extend($set, { relation: _.union(doc.relation, destinationDoc.relation) }),
      $inc: { outstanding: doc.outstanding },
    };
    Partners.update(destinationId, modifier, { selector: destinationDoc });

    Contracts.update({ partnerId: _id }, { $set: { partnerId: destinationId } }, { multi: true });
    Memberships.update({ partnerId: _id }, { $set: { partnerId: destinationId } }, { multi: true });
    Transactions.update({ partnerId: _id }, { $set: { partnerId: destinationId } }, { multi: true });
    Delegations.update({ sourceId: _id }, { $set: { sourceId: destinationId } }, { multi: true });
    Delegations.update({ targetId: _id }, { $set: { targetId: destinationId } }, { multi: true });
    // Topics.update({ voteCasts: _id }, ...
    Partners.remove(_id);
  },
});

export const remove = new ValidatedMethod({
  name: 'partners.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Partners, _id);
    checkPermissions(this.userId, 'partners.remove', doc);
    checkNoOutstanding(doc);
    const membership = Memberships.findOne({ partnerId: _id });
    if (membership) throw new Meteor.Error('err_unableToRemove', `Partner ${_id} may not be removed, until membership ${membership._id} is using it.`);
    const transaction = Transactions.findOne({ partnerId: _id });
    if (transaction) throw new Meteor.Error('err_unableToRemove', `Partner ${_id} may not be removed, until transaction ${transaction._id} is using it.`);
    const contract = Contracts.findOne({ partnerId: _id });
    if (contract) throw new Meteor.Error('err_unableToRemove', `Partner ${_id} may not be removed, until contract ${contract._id} is using it.`);
    return Partners.remove(_id);
  },
});

export const remindOutstandings = new ValidatedMethod({
  name: 'partners.remindOutstandings',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Partners, _id);
    checkPermissions(this.userId, 'partners.remindOutstandings', doc);
    if (Meteor.isServer) return sendOutstandingsEmail(_id);
  },
});

Partners.methods = Partners.methods || {};
_.extend(Partners.methods, { insert, update, remove, remindOutstandings });
_.extend(Partners.methods, crudBatchOps(Partners));
