import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ShareSchema } from '/imports/api/memberships/share.js';

export const Memberships = new Mongo.Collection('memberships', {
  transform: function(doc) {
    doc.username = function () {
      return doc.userId ? Meteor.users.findOne(doc.userId).username : '';
    };
    return doc;
  },
});

// Deny all client-side updates since we will be using methods to manage this collection
Memberships.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
//  shares: { type: Array, optional: true },
//  'shares.$': { type: ShareSchema },
  share: { type: ShareSchema, optional: true },
});

Memberships.attachSchema(Memberships.schema);

Factory.define('membership', Memberships, {});
