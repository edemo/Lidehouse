import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import 'meteor/accounts-base';
import { __ } from '/imports/localization/i18n.js';

import { availableLanguages } from '/imports/startup/both/language.js';
import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { flagsSchema, flagsHelpers } from '/imports/api/topics/flags.js';

let getCurrentUserLang = () => { debugAssert(false, 'On the server you need to supply the language, because there is no "currentUser"'); };
if (Meteor.isClient) {
  import { currentUserLanguage } from '/imports/startup/client/language.js';

  getCurrentUserLang = currentUserLanguage;
}

let getActiveCommunityId = () => { debugAssert(false, 'On the server you need to supply the communityId, because there is no "activeCommunity"'); };
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  getActiveCommunityId = function () { return Session.get('activeCommunityId'); };
}

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
  publicEmail: { type: String, regEx: SimpleSchema.RegEx.Email, optional: true },
  address: { type: String, optional: true },
  phone: { type: String, max: 20, optional: true },
  bio: { type: String, optional: true },
});

const frequencyValues = ['never', 'weekly', 'daily', 'frequent'];
const levelValues = ['never', 'high', 'medium', 'low'];

const UserSettingsSchema = new SimpleSchema({
  language: { type: String, allowedValues: availableLanguages, optional: true, autoform: { firstOption: false } },
  delegatee: { type: Boolean, defaultValue: true },
  notiFrequency: { type: String, allowedValues: frequencyValues, defaultValue: 'never', autoform: autoformOptions(frequencyValues, 'schemaUsers.settings.notiFrequency.') },
//  notiLevel: { type: String, allowedValues: levelValues, defaultValue: 'never', autoform: autoformOptions(levelValues, 'schemaUsers.settings.notiLevel.') },
  newsletter: { type: Boolean, defaultValue: false },
});

const defaultAvatar = '/images/avatars/avatarnull.png';
// const defaultAvatar = 'http://pannako.hu/wp-content/uploads/avatar-1.png';

// index in the user.lastSeens array (so no need to use magic numbers)
Meteor.users.SEEN_BY = {
  EYES: 0,
  NOTI: 1,
};

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

  avatar: { type: String, /* regEx: SimpleSchema.RegEx.Url,*/ defaultValue: defaultAvatar, optional: true },
  profile: { type: PersonProfileSchema, optional: true },
  settings: { type: UserSettingsSchema },

  status: { type: String, allowedValues: ['online', 'standby', 'offline'], defaultValue: 'offline', optional: true, autoform: { omit: true } },

  // lastSeens.0 is what was seen on screen, lastSeens.1 is to which the email notification was sent out
  lastSeens: { type: Array, autoValue() { if (this.isInsert) return [{}, {}]; }, autoform: { omit: true } },
  'lastSeens.$': { type: Object, blackbox: true, autoform: { omit: true } },
    // topicId -> { timestamp: lastseen comment's createdAt (if seen any), commentCounter }

  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true } },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

Meteor.startup(function indexMeteorUsers() {
  if (Meteor.isServer) {
    Meteor.users._ensureIndex({ 'emails.0.address': 1 });
  }
});

export function initialUsername(user) {
  const email = user.emails[0].address;
  const emailChunk = email.split('@')[0].substring(0, 5);
  const userId = user._id;
  const idChunk = userId.substring(0, 5);
  const userName = emailChunk + '_' + idChunk;
  return userName;
};

Meteor.users.helpers({
  language() {
    return this.settings.language || 'en';
  },
  safeUsername() {
    // If we have a username in db return that, otherwise let it be anonymous
    if (this.username && this.username.substring(0, 15) === 'deletedAccount_') return `[${__('deletedUser')}]`;
    if (this.username) return this.username;
    return `[${__('anonymous')}]`;
  },
  fullName(lang = getCurrentUserLang()) {
    if (this.profile && this.profile.lastName && this.profile.firstName) {
      if (lang === 'hu') {
        return this.profile.lastName + ' ' + this.profile.firstName;
      } else {
        return this.profile.firstName + ' ' + this.profile.lastName;
      }
    }
    return undefined;
  },
  displayName(lang = getCurrentUserLang()) {
    return this.fullName(lang) || this.safeUsername();     // or fallback to the username
  },
  displayOfficialName(communityId = getActiveCommunityId(), lang = getCurrentUserLang()) {
    const membership = Memberships.findOne({ communityId, approved: true, active: true, personId: this._id, 'person.idCard.name': { $exists: true } });
    if (membership) { return membership.Person().displayName(lang)};
    return this.displayName(lang);
  },
  toString() {
    return this.displayOfficialName();
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
    return Memberships.find({ communityId, approved: true, active: true, personId: this._id });
  },
  ownerships(communityId) {
    return Memberships.find({ communityId, approved: true, active: true, role: 'owner', personId: this._id });
  },
  ownedParcels(communityId) {
    const parcelIds = _.pluck(this.ownerships(communityId).fetch(), 'parcelId');
    const parcels = parcelIds.map(pid => Parcels.findOne(pid));
    const ownedParcels = parcels.filter(elem => elem);
    return ownedParcels;
  },
  activeRoles(communityId) {
    return Memberships.find({ communityId, approved: true, active: true, personId: this._id }).fetch().map(m => m.role);
  },
  communities() {
    const memberships = Memberships.find({ approved: true, active: true, personId: this._id }).fetch();
    const communityIds = _.uniq(_.pluck(memberships, 'communityId'));
    const communities = Communities.find({ _id: { $in: communityIds } });
    // console.log(this.safeUsername(), ' is in communities: ', communities.fetch().map(c => c.name));
    return communities;
  },
  isInCommunity(communityId) {
    return !!Memberships.findOne({ communityId, active: true, approved: true, personId: this._id });
  },
  isUnapprovedInCommunity(communityId) {
    return !!Memberships.findOne({ communityId, approved: false, personId: this._id });
  },
  // Voting
  votingUnits(communityId) {
    let sum = 0;
    Memberships.find({ communityId, active: true, approved: true, role: 'owner', personId: this._id }).forEach(m => (sum += m.votingUnits()));
    return sum;
  },
  hasRole(roleName, communityId) {
    const userHasTheseRoles = this.activeRoles(communityId);
    return _.contains(userHasTheseRoles, roleName);
  },
  hasPermission(permissionName, communityId, object) {
    const permission = Permissions.find(p => p.name === permissionName);
    debugAssert(permission, `No such permission "${permissionName}"`);
    const rolesWithThePermission = permission.roles;
    if (_.contains(rolesWithThePermission, 'null')) return true;
    if (permission.allowAuthor && object && (object.userId === this._id)) return true;
    const userHasTheseRoles = this.activeRoles(communityId);
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
    const user = Meteor.users.findOne(userId);
    if (!user) return true;
    return user.isFlaggedBy(this._id);
  },
});

Meteor.users.helpers(flagsHelpers);

Meteor.users.attachSchema(Meteor.users.schema);
Meteor.users.attachSchema(flagsSchema);
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
  flags: 1,
};
