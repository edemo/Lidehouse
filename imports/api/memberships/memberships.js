/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import '/utils/fractional.js';  // TODO: should be automatic, but not included in tests
if (Meteor.isClient) import { Session } from 'meteor/session';

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
  identifier: { type: String }, // cegjegyzek szam vagy szig szam - egyedi!!!
  mothersName: { type: String, optional: true },
  dob: { type: Date, optional: true },
});

const PersonSchema = new SimpleSchema({
    // The user is connected with the membership via 3 possible ways: userId (registered user),
    userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
      autoform: {
        options() {
          const communityId = Meteor.isClient ? Session.get('activeCommunityId') : undefined;
          return Communities.findOne(communityId).users().map(function option(u) { return { label: u.displayName(), value: u._id }; });
        },
      },
    },
    // userEmail (not registered, but invitation is sent)
    userEmail: { type: String, regEx: SimpleSchema.RegEx.Email, optional: true },
    // idCard (confirmed identity papers)
    idCard: { type: IdCardSchema, optional: true },  
});

// Memberships are the Ownerships, Benefactorships and Roleships in a single collection
Memberships.schema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  role: { type: String, allowedValues() { return Roles.find({}).map(r => r.name); },
    autoform: {
      options() {
        return Roles.find({}).map(function option(r) { return { label: __(r.name), value: r._id }; });
      },
    },
  },
  // TODO should be conditional on role === 'owner'
  ownership: { type: OwnershipSchema, optional: true },
  // TODO should be conditional on role === 'benefactor'
  benefactorship: { type: BenefactorshipSchema, optional: true },
}, PersonSchema]);

// Statuses of members:
// 0. Email not given
// 1. Email given - not yet registered user (maybe later will be invited)
// 2. Email given - not yet registered user, invitation already sent
// 3. Email given - registered user, but email not yet verified [2 and 3 are very similar, as accepting invitation veryfies the email]
// 4. Email given - registered user, with verified email (userId field also set)
// -. idCard not registered
// +. idCard registered
// These are orthogonal. Status of (0+) means: No email given, but has registered idCard.

// A megadott email címmel még nincs regisztrált felhasználó a rendszerben.
// Küldjünk egy meghívót a címre?

Memberships.helpers({
  hasVerifiedIdCard() {
    return !!this.idCard;
  },
  hasUser() {
    return !!this.userId;
  },
  user() {
    if (this.userId) return Meteor.users.findOne(this.userId);
    return undefined;
  },
  userEmail() {
    if (this.userId) return this.user().emails[0].address;
    if (this.userEmail) return this.userEmail;
    return undefined;
  },
  displayName() {
    if (this.idCard) return this.idCard.name;
    if (this.userId) return this.user().displayName();
    if (this.userEmail) return this.userEmail;
    return 'should never get here';
  },
  identifier() {
    if (this.userId) return this.userId;
    if (this.idCard) return this.idCard.identifier;
    if (this.userEmail) return this.userEmail;
    return 'should never get here';
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
    if (!this.parcel().approved) return 0;
    // const votingUnits = this.parcel().units * this.ownership.share.toNumber();
    const votingUnits = this.isRepresentor() ? this.parcel().units : 0;
    return votingUnits;
  },
  votingShare() {
    if (!this.parcel().approved) return 0;
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

Memberships.modifiableFields = [
  'userEmail',
  'userId',
  'role',
  'ownership.share',
  'ownership.representor',
  'benefactorship.type',
];

Factory.define('membership', Memberships, {
  communityId: () => Factory.get('community'),
  userId: () => Factory.get('user'),
  role: 'guest',
});
