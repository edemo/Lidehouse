import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.schema.validator({ clean: true }),

  run(doc) {
    // User can only delegate his own votes
    if (this.userId !== doc.sourceUserId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: delegations.insert, doc: {${doc}}`);
    }

    // User can only delegate to those who allow incoming delegations
    const targetUser = Meteor.users.findOne(doc.targetUserId);
    if (!targetUser.settings.delegationsAllowed) {
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
  }).validator({ clean: true }),

  run({ _id, modifier }) {
    Delegations.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'delegations.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
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
    Meteor.users.update(userId, { $set: { 'settings.delegationsAllowed': value } });
  },
});
