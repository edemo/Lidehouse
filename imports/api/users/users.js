import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import 'meteor/accounts-base';

import { Timestamps } from '/imports/api/timestamps.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Permissions } from '/imports/api/permissions/permissions.js';

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
  hasPermission(permissionName, communityId) {
    const permission = Permissions.findOne({ _id: permissionName });
    const rolesWithThePermission = permission.roles;
    const userHasTheseRoles = this.roles(communityId);
    const result = _.some(userHasTheseRoles, role => _.contains(rolesWithThePermission, role));
    console.log(this.safeUsername(), ' haspermission ', permissionName, ' in ', communityId, ' is ', result);
    return result;
  },
  fullName() {
    if (this.profile && this.profile.lastName && this.profile.firstName) {
      return this.profile.lastName + ' ' + this.profile.firstName;
    }
    // or fallback to the username
    return `[${this.safeUsername()}]`;
  },
  safeUsername() {
    // If we have a username in db return that, otherwise generate one from her email address
    if (this.username) return this.username;
    const email = this.emails[0].address;
    return email.substring(0, email.indexOf('@'));
  },
  toString() {
    return this.fullName();
  },
});

/*
// Code from https://github.com/aldeed/meteor-collection2

export const CountrySchema = new SimpleSchema({
  name: { type: String },
  code: { type: String, regEx: /^[A-Z]{2}$/ },
});

export const UserProfileSchema = new SimpleSchema({
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

const UserProfileSchema = new SimpleSchema({
  firstName: { type: String },
  lastName: { type: String },
  bio: { type: String, optional: true },
});

const UserSettingsSchema = new SimpleSchema({
  language: { type: String, allowedValues: ['en', 'hu'], defaultValue: 'en' },
  delegationsEnabled: { type: Boolean, defaultValue: true },
});

const defaultAvatar = 'https://yt3.ggpht.com/-MlnvEdpKY2w/AAAAAAAAAAI/AAAAAAAAAAA/tOyTWDyUvgQ/s900-c-k-no-mo-rj-c0xffffff/photo.jpg';
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
  profile: { type: UserProfileSchema, optional: true },
  avatar: { type: String, regEx: SimpleSchema.RegEx.Url, defaultValue: defaultAvatar },
  status: { type: String, allowedValues: ['online', 'standby', 'offline'], defaultValue: 'offline', autoform: { omit: true } },

  emails: { type: Array },
  'emails.$': { type: Object },
  'emails.$.address': { type: String, regEx: SimpleSchema.RegEx.Email },
  'emails.$.verified': { type: Boolean },

  settings: { type: UserSettingsSchema },
  lastSeens: { type: Object, blackbox: true, optional: true, autoform: { omit: true } },

  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true } },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

Meteor.users.attachSchema(Meteor.users.schema);
Meteor.users.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Meteor.users.simpleSchema().i18n('users');
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
  emails: 1, // TODO: email is not public, but we now need for calculating derived username
};
