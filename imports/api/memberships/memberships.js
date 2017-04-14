import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ShareSchema } from './share.js';

export const Memberships = new Mongo.Collection('memberships');

// Deny all client-side updates since we will be using methods to manage this collection
Memberships.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Memberships.schema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, autoValue: () => this.userId, autoform: { omit: true } },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
//  shares: { type: Array, optional: true },
//  'shares.$': { type: ShareSchema },
  share: { type: ShareSchema },
  // denormalized:
  username: { type: String,
    max: 20,
    autoValue() { return Meteor.users.findOne({ _id: this.field('userId').value }).username; },
  },
});

Memberships.attachSchema(Memberships.schema);

// This represents the keys from Membership objects that should be published
// to the client. If we add secret properties to Membership objects, don't list
// them here to keep them private to the server.
Memberships.publicFields = {
  userId: 1,
  communityId: 1,
  username: 1,
  shares: 1,
};

Factory.define('membership', Memberships, {});
