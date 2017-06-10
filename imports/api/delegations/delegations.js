import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import faker from 'faker';

export const Delegations = new Mongo.Collection('delegations');

export const ScopeSchema = new SimpleSchema({
  scope: { type: String, allowedValues: ['all', 'community', 'membership', 'topic', 'topicGroup'] },
});

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  scope: { type: ScopeSchema },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);
