/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Roles } from '/imports/api/permissions/roles.js';
import { Fraction } from 'fractional';
import '/utils/fractional.js';  // TODO: should be automatic, but not included in tests
import { Factory } from 'meteor/dburles:factory';

export const Memberships = new Mongo.Collection('memberships');

const OwnershipSchema = new SimpleSchema({
  share: { type: Fraction },
});

// Memberships are the Ownerships and the Roleships in a single collection
Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
    autoform: {
      options() {
        return Meteor.users.find({}).map(function option(u) { return { label: u.fullName(), value: u._id }; });
      },
    },
  },
  role: { type: String, allowedValues() { return Roles.find({}).map(r => r.name); },
    autoform: {
      options() {
        return Roles.find({}).map(function option(r) { return { label: __(r.name), value: r._id }; });
      },
    },
  },
  // TODO should be conditional on role
  ownership: { type: OwnershipSchema, optional: true },
});

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
  parcel() {
    const parcel = Parcels.findOne(this.parcelId);
    return parcel;
  },
  totalunits() {
    const community = this.community();
    if (!community) return undefined;
    return community.totalunits;
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
  votingUnits() {
    const parcel = this.parcel();
    const votingUnits = parcel.units * this.ownership.share.toNumber();
    return votingUnits;
  },
  votingShare() {
    const parcel = this.parcel();
    const votingShare = parcel.share().multiply(this.ownership.share);
    return votingShare;
  },
  toString() {
    let result = __(this.role);
    const parcel = this.parcel();
    if (parcel) result += ' ' + parcel.toString();
    return result;
  },
});

Memberships.attachSchema(Memberships.schema);
Memberships.attachSchema(Timestamps);

// TODO: Would be much nicer to put the translation directly on the OwnershipSchema,
// but unfortunately when you pull it into Memberships.schema, it gets copied over,
// and that happens earlier than TAPi18n extra comtype transaltions get added.
Meteor.startup(function attach() {
  Memberships.simpleSchema().i18n('schemaMemberships');
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
  role: 'guest',
});
