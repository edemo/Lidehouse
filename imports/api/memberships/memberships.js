/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Roles } from '/imports/api/permissions/roles.js';

export const Memberships = new Mongo.Collection('memberships');

Memberships.helpers({
  hasUser() {
    return !!this.userId;
  },
  user() {
    const user = Meteor.users.findOne(this.userId);
    return user;
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  totalshares() {
    return this.community().totalshares;
  },
  // TODO: move this to the house package
  location() {
    if (!this.ownership) return '';
    return this.ownership.floor + '/' + this.ownership.number;
  },
  name() {
    if (!this.ownership) return this.role;
    // const letter = this.ownership.type.substring(0, 1);
    return this.location() + ' ' + this.role;
  },
});

const OwnershipSchema = new SimpleSchema({
  serial: { type: Number },
  share: { type: Number },
  /*  name: { type: String,
      autoValue() {
        if (this.isInsert) {
          const letter = this.field('type').value.substring(0,1);
          const floor = this.field('floor').value;
          const number = this.field('number').value;
          return letter + '-' + floor + '/' + number;
        }
        return undefined; // means leave whats there alone for Updates, Upserts
      },
    },
  */
  // TODO: move these into the House package
  floor: { type: String },
  number: { type: String },
  type: { type: String,
    allowedValues: ['Apartment', 'Parking', 'Storage'],
  },
});

Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  role: { type: String, allowedValues() { return Roles.find({}).map(r => r.name); } },
  // TODO should be conditional on role
  ownership: { type: OwnershipSchema, optional: true },
});

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
        return Roles.find({}).map(function option(r) { return { label: r.name, value: r._id }; }); // _id === name BTW
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

Memberships.attachSchema(Memberships.schema);

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
