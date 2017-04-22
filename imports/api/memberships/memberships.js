/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { ShareSchema } from '/imports/api/memberships/share.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Memberships = new Mongo.Collection('memberships');

Memberships.helpers({
  hasUser() {
    return !!this.userId;
  },
  getUser() {
    const user = Meteor.users.findOne(this.userId);
    debugAssert(user);
    return user;
  },
  username() {
    return this.hasUser() ? this.getUser().username : '';
  },
  getCommunity() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
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
