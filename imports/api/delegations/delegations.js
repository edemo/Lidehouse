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

const chooseOwnership = {
  options() {
    return Memberships.find({ userId: Meteor.userId(), role: 'owner' }).map(function option(m) {
      return { label: m.parcel(), value: m._id };
    });
  },
};

const chooseUser = {
  options() {
    return Meteor.users.find({}).map(function option(u) {
      return { label: u.fullName(), value: u._id };
    });
  },
};

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  scope: { type: String, allowedValues: Delegations.scopes },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseOwnership },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Delegations.simpleSchema().i18n('schemaDelegations');
});
