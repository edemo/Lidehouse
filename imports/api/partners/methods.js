import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { checkNoOutstanding } from '/imports/api/behaviours/accounting-location.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { sendOutstandingsEmail } from '/imports/email/outstandings-send.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Partners } from './partners.js';


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
    const newContactEmail = modifier.$set['contact.email'];
    const contactEmail = doc.contact && doc.contact.email;
    if (newContactEmail && newContactEmail !== contactEmail) {
      const partner = Partners.findOne({ _id: { $ne: doc._id }, communityId: doc.communityId, 'contact.email': newContactEmail });
      if (partner) throw new Meteor.Error('err_alreadyExists', `Partner with this email address already exists: ${partner.displayName()}`);
      if (doc.userId && Meteor.isServer) {
        if (doc.user().isVerified()) {
          throw new Meteor.Error('err_permissionDenied', 'The contact email address is not modifiable, it is connected to a user.');
        } else {
          if (!modifier.$unset) modifier.$unset = {};
          modifier.$unset.userId = '';
          delete modifier.$set.userId;
        }
      }
    }
    const result = Partners.update({ _id }, modifier);
    return result;
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
