import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import faker from 'faker';

export const Delegations = new Mongo.Collection('delegations');

Delegations.scopes = ['general', 'community', 'membership', 'topicGroup', 'topic'];

Delegations.scopeSchema = new SimpleSchema({
  scope: { type: String, allowedValues: Delegations.scopes },
});

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  scope: { type: Delegations.scopeSchema },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);
