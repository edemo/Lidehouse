/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { ShareSchema } from '/imports/api/memberships/share.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Memberships = new Mongo.Collection('memberships', {
  transform(doc) {
    doc.hasUser = function () {
      return !!doc.userId;
    };
    doc.getUser = function () {
      const user = Meteor.users.findOne(doc.userId);
//      debugAssert(user);
      return user;
    };
    doc.username = function () {
      return doc.hasUser() ? doc.getUser().username : '';
    };
    doc.getCommunity = function () {
      const community = Communities.findOne(doc.communityId);
      debugAssert(community);
      return community;
    };
    return doc;
  },
});

Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
//  shares: { type: Array, optional: true },
//  'shares.$': { type: ShareSchema },
  share: { type: ShareSchema, optional: true },
});

Memberships.attachSchema(Memberships.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Memberships.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Factory.define('membership', Memberships, {});
