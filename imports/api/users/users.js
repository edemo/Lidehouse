import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import 'meteor/accounts-base';

import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Delegations } from '/imports/api/delegations/delegations.js';

export const nullUser = {
  hasPermission(permissionName, communityId, object) {
    const permission = Permissions.find(perm => perm.name === permissionName);
    if (!permission) return false;
    return _.contains(permission.roles, 'null');
  },
};

Meteor.userOrNull = function userOrNull() {
  return Meteor.user() || nullUser;
};

Meteor.users.findOneOrNull = function findOneOrNull(userId) {
  return Meteor.users.findOne(userId) || nullUser;
};

/*
// Suggestion for full User Profile:
// Code from https://github.com/aldeed/meteor-collection2

export const CountrySchema = new SimpleSchema({
  name: { type: String },
  code: { type: String, regEx: /^[A-Z]{2}$/ },
});

export const PersonProfileSchema = new SimpleSchema({
  firstName: { type: String, optional: true },
  lastName: { type: String, optional: true },
  birthday: { type: Date, optional: true },
  gender: { type: String, allowedValues: ['male', 'female'], optional: true },
  organization: { type: String, optional: true },
  website: { type: String, regEx: SimpleSchema.RegEx.Url, optional: true },
  bio: { type: String, optional: true },
  country: { type: CountrySchema, optional: true },
});
*/

const PersonProfileSchema = new SimpleSchema({
  firstName: { type: String, optional: true },
  lastName: { type: String, optional: true },
  nick: { type: String, optional: true },
  address: { type: String, optional: true },
  phone: { type: String, max: 20, optional: true },
  bio: { type: String, optional: true },
});

const frequencyValues = ['never', 'weekly', 'daily', 'frequent'];
const levelValues = ['never', 'high', 'medium', 'low'];

const UserSettingsSchema = new SimpleSchema({
  language: { type: String, allowedValues: ['en', 'hu'], optional: true, autoform: { firstOption: false } },
  delegatee: { type: Boolean, defaultValue: true },
  notiFrequency: { type: String, allowedValues: frequencyValues, defaultValue: 'never', autoform: autoformOptions(frequencyValues, 'schemaUsers.settings.notiFrequency.') },
  notiLevel: { type: String, allowedValues: levelValues, defaultValue: 'never', autoform: autoformOptions(levelValues, 'schemaUsers.settings.notiLevel.') },
  newsletter: { type: Boolean, defaultValue: false },
});

const defaultAvatar = '/images/avatars/avatarnull.png';
// const defaultAvatar = 'http://pannako.hu/wp-content/uploads/avatar-1.png';

// index in the user.lastSeens array (so no need to use magic numbers)
Meteor.users.SEEN_BY_EYES = 0;
Meteor.users.SEEN_BY_NOTI = 1;

Meteor.users.schema = new SimpleSchema({
  // For accounts-password, either emails or username is required, but not both.
  // It is OK to make this optional because the accounts-password package does its own validation.
  // Third-party login packages may not require either. Adjust this as necessary for your usage
  username: { type: String, optional: true },
/*    autoValue() {
      if (this.isInsert) {
        const email = this.field('emails.0.address').value;
        return email.substring(0, email.indexOf('@'));
      }
      return undefined; // means leave whats there alone for Updates, Upserts
    },
  },*/

  emails: { type: Array },
  'emails.$': { type: Object },
  'emails.$.address': { type: String, regEx: SimpleSchema.RegEx.Email },
  'emails.$.verified': { type: Boolean, defaultValue: false, optional: true },

  profile: { type: PersonProfileSchema, optional: true },
  avatar: { type: String, /* regEx: SimpleSchema.RegEx.Url,*/ defaultValue: defaultAvatar, optional: true },
  status: { type: String, allowedValues: ['online', 'standby', 'offline'], defaultValue: 'offline', optional: true, autoform: { omit: true } },

  settings: { type: UserSettingsSchema },
  // lastSeens.0 is what was seen on screen, lastSeens.1 is to which the email notification was sent out
  lastSeens: { type: Array, autoValue() { if (this.isInsert) return [{}, {}]; }, autoform: { omit: true } },
  'lastSeens.$': { type: Object, blackbox: true, autoform: { omit: true } },
    // topicId -> { timestamp: lastseen comment's createdAt (if seen any), commentCounter }

  blocked: { type: Array, defaultValue: [], autoform: { omit: true } }, // blocked users
  'blocked.$': { type: String, regEx: SimpleSchema.RegEx.Id }, // userIds

  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true } },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

function currentUserLanguage() {
  return Meteor.user().settings.language || 'en';
}

Meteor.users.helpers({
  safeUsername() {
    // If we have a username in db return that, otherwise generate one from her email address
    if (this.username) return this.username;
    const email = this.emails[0].address;
    return email.substring(0, email.indexOf('@'));
  },
  fullName() {
    if (this.profile && this.profile.lastName && this.profile.firstName) {
      if (currentUserLanguage() === 'hu') {
        return this.profile.lastName + ' ' + this.profile.firstName;
      } else {
        return this.profile.firstName + ' ' + this.profile.lastName;
      }
    }
    return undefined;
  },
  displayName() {
    return this.fullName() || `[${this.safeUsername()}]`;     // or fallback to the username
  },
  toString() {
    return this.displayName();
  },
  getPrimaryEmail() {
    return this.emails[0].address;
  },
  setPrimaryEmail(address) {
    // TODO: Should check if email already exist in the system
    this.emails[0].address = address;
    this.emails[0].verified = false;
    // TODO: A verification email has to be sent to the user now
  },
  // Memberships
  memberships(communityId) {
    return Memberships.find({ 'person.userId': this._id, communityId });
  },
  ownerships(communityId) {
    return Memberships.find({ 'person.userId': this._id, communityId, role: 'owner' });
  },
  ownedParcels(communityId) {
    const parcelIds = _.pluck(this.ownerships(communityId).fetch(), 'parcelId');
    const parcels = parcelIds.map(pid => Parcels.findOne(pid));
    const ownedParcels = parcels.filter(elem => elem);
    return ownedParcels;
  },
  roles(communityId) {
    return Memberships.find({ 'person.userId': this._id, communityId }).fetch().map(m => m.role);
  },
  communities() {
    const memberships = Memberships.find({ 'person.userId': this._id }).fetch();
    const communityIds = _.pluck(memberships, 'communityId');
    const communities = Communities.find({ _id: { $in: communityIds } });
    // console.log(this.safeUsername(), ' is in communities: ', communities.fetch().map(c => c.name));
    return communities;
  },
  isInCommunity(communityId) {
    return !!Memberships.findOne({ 'person.userId': this._id, communityId });
  },
  // Voting
  votingUnits(communityId) {
    let sum = 0;
    Memberships.find({ 'person.userId': this._id, communityId, role: 'owner' }).forEach(m => (sum += m.votingUnits()));
    return sum;
  },
  hasPermission(permissionName, communityId, object) {
    const permission = Permissions.find(p => p.name === permissionName);
    debugAssert(permission, `No such permission "${permissionName}"`);
    const rolesWithThePermission = permission.roles;
    if (_.contains(rolesWithThePermission, 'null')) return true;
    if (permission.allowAuthor && object && (object.userId === this._id)) return true;
    const userHasTheseRoles = this.roles(communityId);
    const result = _.some(userHasTheseRoles, role => _.contains(rolesWithThePermission, role));
//  console.log(this.safeUsername(), ' haspermission ', permissionName, ' in ', communityId, ' is ', result);
    return result;
  },
  totalOwnedUnits(communityId) {
    let total = 0;
    this.ownerships(communityId).forEach(m => (total += m.votingUnits()));
    return total;
  },
  totalDelegatedToMeUnits(communityId) {
    let total = 0;
    // TODO: needs traversing calculation
    Delegations.find({ targetPersonId: this._id }).forEach(function addUpUnits(d) {
      const sourceUser = Meteor.users.findOne(d.sourcePersonId);
      total += sourceUser.votingUnits();
    });
    return total;
  },
  totalVotingPower(communityId) {
    const community = Communities.findOne(communityId);
    if (!community) return new Fraction(0);
    const totalVotingUnits = this.totalOwnedUnits(communityId) + this.totalDelegatedToMeUnits(communityId);
    return new Fraction(totalVotingUnits, community.totalunits);
  },
  // Finances
  balance(communityId) {
    const parcels = this.ownedParcels(communityId);
    let totalBalance = 0;
    parcels.forEach((parcel) => {
      totalBalance += parcel.balance();
    });
    return totalBalance;
  },
  hasBlocked(userId) {
    return _.contains(this.blocked, userId);
  },
});

Meteor.users.attachSchema(Meteor.users.schema);
Meteor.users.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Meteor.users.simpleSchema().i18n('schemaUsers');
});

// Deny all client-side updates since we will be using methods to manage this collection
Meteor.users.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Meteor.users.publicFields = {
  username: 1,
  profile: 1,
  avatar: 1,
  status: 1,
  settings: 1,
  'emails.address': 1, // TODO: email is not public, but we now need for calculating derived username
};
