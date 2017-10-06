/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import '/utils/fractional.js';  // TODO: should be automatic, but not included in tests

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Factory } from 'meteor/dburles:factory';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Roles } from '/imports/api/permissions/roles.js';

export const Memberships = new Mongo.Collection('memberships');

// Parcels can be jointly owned, with each owner having a fractional *share* of it
// in this case only a single *representor* can cast votes for this parcel.
// The repsesentor can be defined by setting the flag, or implicitly by being the first owner added.

const OwnershipSchema = new SimpleSchema({
  share: { type: Fraction },
  representor: { type: Boolean, optional: true },
});

const benefactorTypeValues = ['rental', 'favor', 'right'];
const BenefactorshipSchema = new SimpleSchema({
  type: { type: String, allowedValues: benefactorTypeValues, autoform: autoformOptions(benefactorTypeValues) },
});

const idCardTypeValues = ['person', 'legal'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, allowedValues: idCardTypeValues, autoform: autoformOptions(idCardTypeValues) },
  name: { type: String },
  address: { type: String },
  identifier: { type: String }, // cegjegyzek szam vagy szig szam
  mothersName: { type: String, optional: true },
  dob: { type: Date, optional: true },
});

// Memberships are the Ownerships, Benefactorships and Roleships in a single collection
Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  role: { type: String, allowedValues() { return Roles.find({}).map(r => r.name); },
    autoform: {
      options() {
        return Roles.find({}).map(function option(r) { return { label: __(r.name), value: r._id }; });
      },
    },
  },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
    autoform: {
      options() {
        return Meteor.users.find({}).map(function option(u) { return { label: u.fullName(), value: u._id }; });
      },
    },
  },
  idCard: { type: IdCardSchema, optional: true },
  // TODO should be conditional on role === 'owner'
  ownership: { type: OwnershipSchema, optional: true },
  // TODO should be conditional on role === 'benefactor'
  benefactorship: { type: BenefactorshipSchema, optional: true },
});

Memberships.helpers({
  hasUser() {
    return !!this.userId;
  },
  hasIdCard() {
    return !!this.idCard;
  },
  user() {
    const user = Meteor.users.findOne(this.userId);
    return user;
  },
  displayName() {
    if (this.hasIdCard()) return this.idCard.name;
    if (this.hasUser()) return this.user().fullName();
    debugAssert(false);
    return '';
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
  isRepresentor() {
    const parcel = this.parcel();
    return (parcel.representor()._id === this._id);
  },
  votingUnits() {
    // const votingUnits = this.parcel().units * this.ownership.share.toNumber();
    const votingUnits = this.isRepresentor() ? this.parcel().units : 0;
    return votingUnits;
  },
  votingShare() {
    // const votingShare = this.parcel().share().multiply(this.ownership.share);
    const votingShare = this.isRepresentor() ? this.parcel().share() : 0;
    return votingShare;
  },
  toString() {
    let result = __(this.role);
    const parcel = this.parcel();
    if (parcel) result += (' ' + parcel.toString());
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
