import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import 'meteor/accounts-base';

import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Delegations } from '/imports/api/delegations/delegations.js';

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

const UserSettingsSchema = new SimpleSchema({
  language: { type: String, allowedValues: ['en', 'hu'], defaultValue: 'hu' },
  delegatee: { type: Boolean, defaultValue: true },
});

const defaultAvatar = 'http://www.mycustomer.com/sites/all/themes/pp/img/default-user.png';
// const defaultAvatar = 'https://yt3.ggpht.com/-MlnvEdpKY2w/AAAAAAAAAAI/AAAAAAAAAAA/tOyTWDyUvgQ/s900-c-k-no-mo-rj-c0xffffff/photo.jpg';
// const defaultAvatar = 'http://pannako.hu/wp-content/uploads/avatar-1.png';

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
  'emails.$.verified': { type: Boolean, defaultValue: false, optional: true, autoform: { omit: true } },

  profile: { type: PersonProfileSchema, defaultValue: {}, optional: true },
  avatar: { type: String, regEx: SimpleSchema.RegEx.Url, defaultValue: defaultAvatar, optional: true },
  status: { type: String, allowedValues: ['online', 'standby', 'offline'], defaultValue: 'offline', optional: true, autoform: { omit: true } },

  settings: { type: UserSettingsSchema },
  lastseens: { type: Object, blackbox: true, defaultValue: {}, autoform: { omit: true } },
    // topicId -> { timestamp: lastseen comment's createdAt (if seen any), commentCounter }

  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true } },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

Meteor.users.helpers({
  memberships() {
    return Memberships.find({ userId: this._id });
  },
  ownerships(communityId) {
    return Memberships.find({ userId: this._id, communityId, role: 'owner' });
  },
  roles(communityId) {
    return Memberships.find({ userId: this._id, communityId }).fetch().map(m => m.role);
  },
  communities() {
    const memberships = this.memberships().fetch();
    const communityIds = _.pluck(memberships, 'communityId');
    const communities = Communities.find({ _id: { $in: communityIds } });
    console.log(this.safeUsername(), ' is in communities: ', communities.fetch().map(c => c.name));
    return communities;
  },
  isInCommunity(communityId) {
    return !!Memberships.findOne({ userId: this._id, communityId });
  },
  votingUnits(communityId) {
    let sum = 0;
    Memberships.find({ userId: this._id, communityId, role: 'owner' }).forEach(m => (sum += m.votingUnits()));
    return sum;
  },
  hasPermission(permissionName, communityId, object) {
    const permission = Permissions.findOne({ name: permissionName });
    debugAssert(permission);
    if (permission.allowAuthor && object && (object.userId === this._id)) return true;
    const rolesWithThePermission = permission.roles;
    const userHasTheseRoles = this.roles(communityId);
    const result = _.some(userHasTheseRoles, role => _.contains(rolesWithThePermission, role));
    console.log(this.safeUsername(), ' haspermission ', permissionName, ' in ', communityId, ' is ', result);
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
    Delegations.find({ targetUserId: this._id }).forEach(function addUpUnits(d) {
      const sourceUser = Meteor.users.findOne(d.sourceUserId);
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
  safeUsername() {
    // If we have a username in db return that, otherwise generate one from her email address
    if (this.username) return this.username;
    const email = this.emails[0].address;
    return email.substring(0, email.indexOf('@'));
  },
  fullName() {
    if (this.profile && this.profile.lastName && this.profile.firstName) {
      if (TAPi18n.getLanguage() === 'hu') {
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
  'emails.address': 1, // TODO: email is not public, but we now need for calculating derived username
};
