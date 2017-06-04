import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '../timestamps.js';
import faker from 'faker';

export const Delegations = new Mongo.Collection('delegations');

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id },
  scope: { type: String, allowedValues: ['role', 'topic', 'topicGroup'] },
  objectId: { type: String, regEx: SimpleSchema.RegEx.Id },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);
