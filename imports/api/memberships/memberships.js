/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Roles } from '/imports/api/permissions/roles.js';

export const Memberships = new Mongo.Collection('memberships');

const __ = TAPi18n.__;

Memberships.helpers({
  hasUser() {
    return !!this.userId;
  },
  user() {
    const user = Meteor.users.findOne(this.userId);
    return user;
  },
  userName() {
    if (!this.userId) return 'no user';
    const user = Meteor.users.findOne(this.userId);
    return user.fullName();
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  totalshares() {
    const community = this.community();
    if (!community) return undefined;
    return community.totalshares;
  },
  isOwnership() {
    if (this.role === 'owner') return true;
    debugAssert(!this.ownership);
    return false;
  },
  hasOwnership() {
    if (this.ownership) {
      debugAssert(this.role === 'owner');
      return true;
    }
    return false;
  },
  displayShareFraction() {
    if (!this.hasOwnership()) return 'non-voting';
    const share = this.ownership.share;
    if (!share) return '0';
    const totalshares = this.totalshares();
    if (!totalshares) return '';
    return `${share}/${totalshares}`;
  },
});

const OwnershipSchema = new SimpleSchema({
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id },
  ownedShareC: { type: Number },  // counter
  ownedShareD: { type: Number },  // denominator
});

// Memberships are the Ownerships and the Roleships in a single collection
Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  role: { type: String, allowedValues() { return Roles.find({}).map(r => r.name); } },
  // TODO should be conditional on role
  ownership: { type: OwnershipSchema, optional: true },
});

Memberships.attachSchema(Memberships.schema);

// Next schemas are for the autoforms explicitly
/*
Memberships.schemaForRoleship = new SimpleSchema({
  userId: { type: String,
    optional: true,
    autoform: {
      options() {
        return Meteor.users.find({}).map(function option(u) { return { label: u.fullName(), value: u._id }; });
      },
    },
  },
  role: { type: String,
    autoform: {
      options() {
        return Roles.find({}).map(function option(r) { return { label: __(r.name), value: r._id }; }); // _id === name BTW
      },
    },
  },
});

Memberships.schemaForOwnership = new SimpleSchema({
  userId: { type: String,
    optional: true,
    autoform: {
      options() {
        return Meteor.users.find({}).map(function option(u) { return { label: u.fullName(), value: u._id }; });
      },
    },
  },
  ownership: { type: OwnershipSchema, optional: true },
});
*/
// TODO: Would be much nicer to put the translation directly on the OwnershipSchema,
// but unfortunately when you pull it into Memberships.schema, it gets copied over,
// and that happens earlier than TAPi18n extra comtype transaltions get added.
Meteor.startup(function attach() {
  Memberships.simpleSchema().i18n('memberships');
});

// Deny all client-side updates since we will be using methods to manage this collection
Memberships.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Factory.define('membership', Memberships, {
  communityId: () => Factory.get('community'),
  userId: () => Factory.get('user'),
});
