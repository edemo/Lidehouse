/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Memberships = new Mongo.Collection('memberships');

Memberships.helpers({
  hasUser() {
    return !!this.userId;
  },
  user() {
    const user = Meteor.users.findOne(this.userId);
    return user;
  },
  username() {
    if (!this.userId) return '';
    if (!this.user()) return 'unknown';
    return this.user().username;
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  totalshares() {
    return this.community().totalshares;
  },
  location() {
    if (!this.number) return '';
    return `${this.floor}/${this.number}`;
  },
  name() {
    if (!this.type) return '';
    const letter = this.type.substring(0, 1);
    return `${letter} ${this.floor}/${this.number}`;
  },
});

Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  serial: { type: SimpleSchema.Integer, optional: true },
  share: { type: SimpleSchema.Integer, optional: true },
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
  floor: { type: String, optional: true },
  number: { type: String, optional: true },
  type: { type: String,
    allowedValues: ['Apartment', 'Parking', 'Storage'],
    optional: true,
  },
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
