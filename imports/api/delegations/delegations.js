import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

export const Delegations = new Mongo.Collection('delegations');

Delegations.scopeValues = ['general', 'community', 'topicGroup', 'topic'];

const chooseUser = {
  options() {
    return Meteor.users.find({}).map(function option(u) {
      return { label: u.fullName(), value: u._id };
    });
  },
};

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseUser },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseUser },
  scope: { type: String, allowedValues: Delegations.scopeValues },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
});

Delegations.helpers({
  object() {
    debugAssert(this.scope === 'community');
    return Communities.findOne(this.objectId);
  },
  sourceUser() {
    return Meteor.users.findOne(this.sourceUserId);
  },
  targetUser() {
    return Meteor.users.findOne(this.targetUserId);
  },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Delegations.simpleSchema().i18n('schemaDelegations');
});

// Deny all client-side updates since we will be using methods to manage this collection
Delegations.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
