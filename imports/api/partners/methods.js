import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
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
      if (partner) throw new Meteor.Error('err_alreadyExists', 'Partner with this email address already exists, you can select this person from the dropdown', { partner: partner.displayName() });
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
      if (partner) throw new Meteor.Error('err_alreadyExists', 'Partner with this email address already exists, you can select this person from the dropdown', { partner: partner.displayName() });
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
    if (doc.userId && destinationDoc.userId && doc.userId !== destinationDoc.userId) {
      const user = Meteor.users.findOne(doc.userId);
      if (Meteor.isServer && user.isVerified()) throw new Meteor.Error('err_notAllowed', 'Partners are connected to different users');
    }
    const $set = _.deepExtend({}, doc, destinationDoc);
    delete $set.relation;
    Mongo.Collection.stripAdministrativeFields($set);
    const modifier = {
      $set: _.extend($set, { relation: _.union(doc.relation, destinationDoc.relation) }),
    };
    Partners.update(destinationId, modifier, { selector: destinationDoc });

    Contracts.update({ partnerId: _id }, { $set: { partnerId: destinationId } }, { selector: destinationDoc, multi: true });
    Memberships.update({ partnerId: _id }, { $set: { partnerId: destinationId } }, { selector: { role: 'owner' }, multi: true });
    Transactions.find({ partnerId: _id }).forEach(tx => {
      tx.partnerId = destinationId; // Plus the journalEntries also need to be regenerated
      Transactions.update({ _id: tx._id }, { $set: { partnerId: destinationId } }, { selector: { category: 'bill' } });
      if (tx.isPosted()) Transactions.methods.post._execute({ userId: this.userId }, { _id: tx._id });
    });
    // Balances update happens in Transactions hooks, when journal entries change
    Balances.remove({ communityId: doc.communityId, partner: new RegExp('^' + _id) });
    Delegations.update({ sourceId: _id }, { $set: { sourceId: destinationId } }, { multi: true });
    Delegations.update({ targetId: _id }, { $set: { targetId: destinationId } }, { multi: true });
    if (Meteor.isServer) {
      const votings = Topics.find({ communityId: doc.communityId, category: 'vote' });
      votings.forEach((topic) => {
        if (topic.voteCasts && topic.voteCasts[_id]) {
          const value = topic.voteCasts[_id];
          const voteModifier = { $set: { [`voteCasts.${destinationId}`]: value }, $unset: { [`voteCasts.${_id}`]: '' } };
          const destinationValue = topic.voteCasts[destinationId];
          if (destinationValue) delete voteModifier.$set;
          Topics.update({ _id: topic._id }, voteModifier, { selector: { category: 'vote' } });
          Topics.findOne(topic._id).voteEvaluate();
        }
      });
    }
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
    Balances.checkNullBalance({ communityId: doc.communityId, partner: doc._id });
    const membership = Memberships.findOne({ partnerId: _id });
    if (membership) throw new Meteor.Error('err_unableToRemove', 'Partner may not be removed, until membership is using it', { partner: _id, membership: membership._id });
    const transaction = Transactions.findOne({ partnerId: _id });
    if (transaction) throw new Meteor.Error('err_unableToRemove', 'Partner may not be removed, until transaction is using it', { partner: _id, transaction: transaction._id });
    const contract = Contracts.findOne({ partnerId: _id });
    if (contract) throw new Meteor.Error('err_unableToRemove', 'Partner may not be removed, until contract is using it', { partner: _id, contract: contract._id });
    return Partners.remove(_id);
  },
});

Partners.methods = Partners.methods || {};
_.extend(Partners.methods, { insert, update, merge, remove });
_.extend(Partners.methods, crudBatchOps(Partners));
