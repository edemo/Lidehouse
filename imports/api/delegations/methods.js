import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Delegations } from './delegations.js';

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.simpleSchema().validator({ clean: true }),

  run(doc) {
    // User can only delegate his own votes
    if (this.userId !== doc.sourceUserId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: delegations.insert, doc: {${doc}}, this.userId: {${this.userId}}`);
    }
    // User can only delegate to those who allow incoming delegations
    const targetUser = Meteor.users.findOne(doc.targetUserId);
    if (!targetUser.settings.delegatee) {
      throw new Meteor.Error('err_otherPartyNotAllowed', 'Other party not allowed this activity',
        `Method: delegations.insert, doc: {${doc}}`);
    }

    return Delegations.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'delegations.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Delegations, _id);
    checkModifier(doc, modifier, ['targetUserId', 'scope', 'scopeObjectId']);
    // User can only delegate his own votes
    if (this.userId !== doc.sourceUserId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: delegations.update, doc: {${doc}}, this.userId: {${this.userId}}`);
    }
    // User can only delegate to those who allow incoming delegations
    const targetUser = Meteor.users.findOne(modifier.$set.targetUserId);
    if (!targetUser.settings.delegatee) {
      throw new Meteor.Error('err_otherPartyNotAllowed', 'Other party not allowed this activity',
        `Method: delegations.update, doc: {${doc}}`);
    }

    Delegations.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'delegations.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const delegation = checkExists(Delegations, _id);
    // User can only remove delegations that delegetes from him, or delegates to him.
    if (this.userId !== delegation.sourceUserId && this.userId !== delegation.targetUserId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: delegations.remove, doc: {${delegation}}, this.userId: {${this.userId}}`);
    }

    Delegations.remove(_id);
  },
});

export const allow = new ValidatedMethod({
  name: 'delegations.allow',
  validate: new SimpleSchema({
    value: { type: Boolean },
  }).validator(),

  run({ value }) {
    const userId = this.userId;
    if (value === false) {
      Delegations.remove({ targetUserId: userId });
    }
    Meteor.users.update(userId, { $set: { 'settings.delegatee': value } });
  },
});
