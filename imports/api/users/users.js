import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import 'meteor/accounts-base';
import { __ } from '/imports/localization/i18n.js';

import { availableLanguages } from '/imports/startup/both/language.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { allowedOptions, imageUpload } from '/imports/utils/autoform.js';
import { namesMatch } from '/imports/utils/compare-names.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Notifications } from '/imports/api/notifications/notifications.js';

export let getCurrentUserLang = () => { debugAssert(false, 'On the server you need to supply the language, because there is no "currentUser"'); };
if (Meteor.isClient) {
  import { currentUserLanguage } from '/imports/startup/client/language.js';

  getCurrentUserLang = currentUserLanguage;
}

export const nullUser = {
  hasPermission(permissionName, doc) {
    const permission = Permissions.find(perm => perm.name === permissionName);
    if (!permission) return false;
    return _.contains(permission.roles, 'null');
  },
  memberships(communityId) {
    return [];
  },
  ownerships(communityId) {
    return [];
  },
  ownedParcels(communityId) {
    return [];
  },
  ownedLeadParcels(communityId) {
    return [];
  },
  communityIds() {
    return [];
  },
  communities() {
    return [];
  },
  isFlaggedBy(userId) {
    return false;
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
  publicEmail: _.extend({ optional: true }, SimpleSchema.Types.Email()),
  address: { type: String, optional: true },
  phone: { type: String, max: 20, optional: true },
  bio: { type: String, optional: true, autoform: { rows: 3 } },
});

const frequencyValues = ['never', 'weekly', 'daily', 'frequent'];
const levelValues = ['never', 'high', 'medium', 'low'];

const UserSettingsSchema = new SimpleSchema({
  language: { type: String, allowedValues: availableLanguages, defaultValue: 'en', autoform: { firstOption: false } },
  delegatee: { type: Boolean, defaultValue: true },
  notiFrequency: { type: String, allowedValues: frequencyValues, defaultValue: 'never', autoform: allowedOptions() },
//  notiLevel: { type: String, allowedValues: levelValues, defaultValue: 'never', autoform: allowedOptions() },
  getBillEmail: { type: Boolean, defaultValue: true },
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
  'emails.$.address': SimpleSchema.Types.Email(),
  'emails.$.verified': { type: Boolean, defaultValue: false, optional: true },

  avatar: { type: String, defaultValue: defaultAvatar, optional: true, autoform: imageUpload() },
  profile: { type: PersonProfileSchema, optional: true },
  settings: { type: UserSettingsSchema },

  status: { type: String, allowedValues: ['online', 'standby', 'offline'], defaultValue: 'offline', optional: true, autoform: { omit: true } },

  // lastSeens.0 is what was seen on screen, lastSeens.1 is to which the email notification was sent out
  // lastSeens: { type: Array, autoValue() { if (this.isInsert) return [{}, {}]; }, autoform: { omit: true } },
  // 'lastSeens.$': { type: Object, blackbox: true, autoform: { omit: true } },
    // topicId -> { timestamp: lastseen comment's createdAt (if seen any) }

  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true } },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

Meteor.users.publicFields = {
  username: 1,
  profile: 1,
  avatar: 1,
  status: 1,
  settings: 1,
  flags: 1,
};

Meteor.users.detailedFields = _.extend({
  emails: 1,
  services: 1,
}, Meteor.users.publicFields
);


Meteor.startup(function indexMeteorUsers() {
  if (Meteor.isServer) {
    Meteor.users._ensureIndex({ 'emails.0.address': 1 });
    Meteor.users._ensureIndex({ super: 1 }, { sparse: true });
  }
});

function userRegisteredEmail(user) {
  let email;
  if (user.emails && user.emails.length > 0) {
    email = user.emails[0].address;
  } else if (user.services && Object.values(user.services).length > 0) {
    const serviceWithEmail = Object.values(user.services).find(service => service.email);
    email = serviceWithEmail ? serviceWithEmail.email : undefined;
  }
  return email;
}

export function initialUsername(user) {
  const email = userRegisteredEmail(user);
  const emailChunk = email ? email.split('@')[0].substring(0, 5) : 'user';
  const userId = user._id;
  const idChunk = userId.substring(0, 5);
  const userName = emailChunk + '_' + idChunk;
  return userName;
}

Meteor.users.helpers({
  lastSeens() {
    const noti = Notifications.findOne({ userId: this._id });
    return noti?.lastSeens;
  },
  lastTimeSeenAll() {
    const noti = Notifications.findOne({ userId: this._id });
    return noti?.lastTimeSeenAll;
  },
  isVerified() {
//    debugAssert(Meteor.isServer, 'Email addresses of users are not sent to the clients');
    if (this.emails) return this.emails[0].verified;
    else if (this.services && Object.values(this.services).length > 0) return true;
    return false;
  },
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
  displayProfileName(lang = getCurrentUserLang()) {
    return this.fullName(lang) || this.safeUsername();     // or fallback to the username
  },
  displayOfficialName(communityId = getActiveCommunityId(), lang = getCurrentUserLang()) {
    const partner = Partners.findOne({ communityId, userId: this._id, 'idCard.name': { $exists: true } });
    if (partner) return partner.displayName(lang);
    return this.displayProfileName(lang);
  },
  toString() {
    return this.displayProfileName();
  },
  personNameMismatch(communityId = getActiveCommunityId()) {
    const partner = Partners.findOne({ communityId, userId: this._id, 'idCard.name': { $exists: true } });
    const personName = partner ? partner.idCard.name : undefined;
    if (!personName || !this.profile) return;
    if (!this.profile.firstName && !this.profile.lastName) return;
    if (!this.profile.firstName || !this.profile.lastName) return 'different';
    const nameMatch = namesMatch(this.profile, partner.idCard);
    if (nameMatch) return;
    else return 'different';
  },
  getPrimaryEmail() {
    const user = this;
    return userRegisteredEmail(user);
  },
  setPrimaryEmail(address) {
    // TODO: Should check if email already exist in the system
    if (!this.emails) {
      this.emails = [];
      this.emails.push({});
    }
    this.emails[0].address = address;
    this.emails[0].verified = false;
    // TODO: A verification email has to be sent to the user now
  },
  hasThisEmail(address) {
    return !!_.find(this.emails, e => e.address === address);
  },
  isDemo() {
    return this.getPrimaryEmail() && this.getPrimaryEmail().includes('demouser@demo');
  },
  // Memberships
  partnerId(communityId = getActiveCommunityId()) {
    const partnerIds = Partners.find({ communityId, userId: this._id }).map(p => p._id);
    debugAssert(partnerIds.length <= 1, `A user cannot have more partners in one community. Please merge these partners: ${partnerIds}`);
    return partnerIds[0] || undefined;
  },
  partner(communityId = getActiveCommunityId()) {
    return Partners.findOne({ communityId, userId: this._id });
  },
  partnerIds() {
    const partnerIds = Partners.find({ userId: this._id }).map(p => p._id);
    return partnerIds;
  },
  memberships(communityId) {
    if (!communityId) return [];
    return Memberships.findActive({ communityId, approved: true, userId: this._id });
  },
  ownerships(communityId) {
    if (!communityId) return [];
    return Memberships.findActive({ communityId, approved: true, role: 'owner', userId: this._id });
  },
  ownedParcels(communityId) {
    const parcelIds = _.pluck(this.ownerships(communityId).fetch(), 'parcelId');
    const parcels = parcelIds.map(pid => Parcels.findOne(pid));
    const ownedParcels = parcels.filter(elem => elem);
    return ownedParcels;
  },
  ownedLeadParcels(communityId) {
    return this.ownedParcels(communityId).filter(p => !p.isLed());
  },
  activeRoles(communityId) {
    return _.uniq(this.memberships(communityId).fetch().map(m => m.role));
  },
  communityIds() {
    const memberships = Memberships.findActive({ approved: true, userId: this._id }).fetch();
    const communityIds = _.uniq(_.pluck(memberships, 'communityId'));
    return communityIds;
  },
  communities() {
    const communityIds = this.communityIds();
    const communities = Communities.find({ _id: { $in: communityIds }, status: { $ne: 'closed' } });
    // Log.debug(this.safeUsername(), ' is in communities: ', communities.fetch().map(c => c.name));
    return communities;
  },
  isInCommunity(communityId) {
    return !!Memberships.findOneActive({ communityId, approved: true, userId: this._id });
  },
  isUnapprovedInCommunity(communityId) {
    return !!Memberships.findOne({ communityId, approved: false, userId: this._id });
  },
  hasJoinedCommunity(communityId) {
    return !!Memberships.findOne({ communityId, userId: this._id });
  },
  // Voting
  votingUnits(communityId) {
    let sum = 0;
    Memberships.findActive({ communityId, approved: true, role: 'owner', userId: this._id }).forEach(m => (sum += m.votingUnits()));
    return sum;
  },
  hasRole(roleName, communityId = getActiveCommunityId()) {
    const userHasTheseRoles = this.activeRoles(communityId);
    return _.contains(userHasTheseRoles, roleName);
  },
  hasPermission(permissionName, doc = { communityId: getActiveCommunityId() }, parcelScoped = true) {
    if (this.super) return true;
    const permission = Permissions.find(p => p.name === permissionName);
    debugAssert(permission, `No such permission "${permissionName}"`);
    const creatorId = doc?.creatorId || doc.userId; // uploads use userId
    if (permission.allowAuthor && creatorId && (creatorId === this._id)) return true;
    const entityName = permissionName.split('.')[0];
    const communityId = (entityName === 'communities') ? doc._id : doc.communityId;
    const parcelId = (entityName === 'parcels') ? doc._id : doc.parcelId;
    const rolesWithThePermission = permission.roles;
    const activeMemberships = this.memberships(communityId).fetch();
    let result = false;
    rolesWithThePermission.forEach(role => {
      if (role === 'null') return true;
      activeMemberships.forEach(membership => {
        if (membership.role === role || (membership.role + '@parcel' === role && ((!parcelId && !parcelScoped) || parcelId === membership.parcelId))) {
          result = true;
        }
      });
    });
//    Log.debug(this.safeUsername(), ' haspermission ', permissionName, ' in ', communityId, parcelId, ' is ', result);
//  if (!result) Log.debug(this.safeUsername(), 'current permissions:', this.activeRoles(communityId));
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
    const delegationsToMe = Delegations.find({ targetId: this.partnerId(communityId) }).fetch();
    _.uniq(delegationsToMe, false, d => d.sourceId).forEach(function addUpUnits(d) {
      Memberships.findActive({ communityId, approved: true, role: 'owner', partnerId: d.sourceId }).forEach(function (m) {
        total += m.votingUnits();
      });
    });
    return total;
  },
  totalVotingPower(communityId) {
    const community = Communities.findOne(communityId);
    if (!community) return new Fraction(0);
    const totalVotingUnits = this.totalOwnedUnits(communityId) + this.totalDelegatedToMeUnits(communityId);
    return new Fraction(totalVotingUnits, community.totalUnits());
  },
  hasBlocked(userId) {
    const user = Meteor.users.findOne(userId);
    if (!user) return true;
    return user.isFlaggedBy(this._id);
  },
});

Meteor.users.withPermission = function withPermission(permissionName, doc = { communityId: getActiveCommunityId() }) {
  const permission = Permissions.find(p => p.name === permissionName);
  debugAssert(permission, `No such permission "${permissionName}"`);
  const creatorId = doc?.creatorId || doc.userId; // uploads use userId
  const entityName = permissionName.split('.')[0];
  const communityId = (entityName === 'communities') ? doc._id : doc.communityId;
  const parcelId = (entityName === 'parcels') ? doc._id : doc.parcelId;
  const rolesWithThePermission = permission.roles;
  let activeMemberships;
  if (_.contains(rolesWithThePermission, 'null')) {
    activeMemberships =  Memberships.findActive({ communityId }).fetch();
  } else {
    const parcelScopedRoles = [];
    const communityScopedRoles = [];
    rolesWithThePermission.forEach(role => {
      const split = role.split('@');
      if (split[1] === 'parcel') parcelScopedRoles.push(split[0]);
      else if (!split[1]) communityScopedRoles.push(split[0]);
    });
    const parcelScopedMemberships = Memberships.findActive({ communityId, parcelId, role: { $in: parcelScopedRoles } }).fetch();
    const communityScopedMemberships = Memberships.findActive({ communityId, role: { $in: communityScopedRoles } }).fetch();
    activeMemberships = parcelScopedMemberships.concat(communityScopedMemberships);
  }
  const users = _.uniq(_.pluck(activeMemberships, 'userId'));
  if (permission.allowAuthor && creatorId) users.push(creatorId);
  const superUsers = Meteor.users.find({ super: true }).fetch();
  return users.concat(superUsers);
};

Meteor.users.attachSchema(Meteor.users.schema);
Meteor.users.attachBehaviour(Timestamped);
Meteor.users.attachBehaviour(Flagable);

if (Meteor.isServer) {
  Meteor.users.after.insert(function () {
    Notifications.insert({ userId: this._id, lastSeens: [{}, {}] });
  });
}

Meteor.users.simpleSchema().i18n('schemaUsers');

// Deny all client-side updates since we will be using methods to manage this collection
Meteor.users.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

