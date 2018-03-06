import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Delegations } from './delegations.js';

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.simpleSchema().validator({ clean: true }),

  run(doc) {
    // Normal user can only delegate his own votes, but special permission allows for others' as well
    if (this.userId !== doc.sourceUserId) {
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
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
    // Normal user can only delegate his own votes, but special permission allows for others' as well
    if (this.userId !== doc.sourceUserId) {
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
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
    const doc = checkExists(Delegations, _id);
    // User can only remove delegations that delegetes from him, or delegates to him., unless special permissions
    if (this.userId !== doc.sourceUserId && this.userId !== doc.targetUserId) {
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
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
