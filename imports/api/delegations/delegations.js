import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Memberships } from '../memberships/memberships.js';
import { debugAssert } from '/imports/utils/assert.js';
import faker from 'faker';

export const Delegations = new Mongo.Collection('delegations');

Delegations.helpers({
  object() {
    debugAssert(this.scope === 'membership');
    return Memberships.findOne(this.objectId);
  },
  sourceUser() {
    return Meteor.users.findOne(this.sourceUserId);
  },
  targetUser() {
    return Meteor.users.findOne(this.targetUserId);
  },
  votingShare() {
    const obj = this.object();
    return obj ? obj.votingShare() : 0;
  },
});

Delegations.scopes = ['general', 'community', 'membership', 'topicGroup', 'topic'];

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  scope: { type: String, allowedValues: Delegations.scopes },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);
