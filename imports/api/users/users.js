import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import 'meteor/accounts-base';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Permissions } from '/imports/api/permissions/permissions.js';

// Code from https://github.com/aldeed/meteor-collection2

export const CountrySchema = new SimpleSchema({
  name: { type: String },
  code: { type: String, regEx: /^[A-Z]{2}$/ },
});

export const UserProfileSchema = new SimpleSchema({
  firstName: { type: String, optional: true },
  lastName: { type: String, optional: true },
  birthday: { type: Date, optional: true },
  gender: { type: String, allowedValues: ['Male', 'Female'], optional: true },
  organization: { type: String, optional: true },
  website: { type: String, regEx: SimpleSchema.RegEx.Url, optional: true },
  bio: { type: String, optional: true },
  country: { type: CountrySchema, optional: true },
});

export const ConcreteRoleSchema = new SimpleSchema({
  name: { type: String },
  communityId: { type: SimpleSchema.RegEx.Id },
});

Meteor.users.helpers({
  memberships() {
    return Memberships.find({ userId: Meteor.userId() }).fetch();
  },
  communities() {
    const memberships = Memberships.find({ userId: Meteor.userId() }).fetch();
    const communityIds = _.pluck(memberships, 'communityId');
    return Communities.find({ _id: { $in: communityIds } });
  },
  hasPermission(permissionName, communityId) {
    const permission = Permissions.findOne({ _id: permissionName });
    const rolesWithThePermission = permission.roles;
    const userHasTheseRoles = this.roles
      ? this.roles.filter(role => role.communityId === communityId).map(role => role.name)
      : [];
    const result = _.some(userHasTheseRoles, role => _.contains(rolesWithThePermission, role));
//    console.log(this.username, ' haspermission ', permissionName, ' in ', communityId, ' is ', result);
    return result;
  },
});

Meteor.users.schema = new SimpleSchema({
  // For accounts-password, either emails or username is required, but not both.
  // It is OK to make this optional because the accounts-password package does its own validation.
  // Third-party login packages may not require either. Adjust this as necessary for your usage
  username: { type: String,
    autoValue() {
      if (this.isInsert) {
        const email = this.field('emails.0.address').value;
        return email.substring(0, email.indexOf('@'));
      }
      return undefined; // means leave whats there alone for Updates, Upserts
    },
  },
  emails: { type: Array },
  'emails.$': { type: Object },
  'emails.$.address': { type: String, regEx: SimpleSchema.RegEx.Email },
  'emails.$.verified': { type: Boolean },
  createdAt: { type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      }
      return undefined;
    },
    autoform: {
      omit: true,
    },
  },
  profile: { type: UserProfileSchema, optional: true },
  // Make sure this services field is in your schema if you're using any of the accounts packages
  services: { type: Object, optional: true, blackbox: true, autoform: { omit: true },
  },

  // Add `roles` to your schema if you use the meteor-roles package.
  // Option 1: Object type
  // If you specify that type as Object, you must also specify the
  // `Roles.GLOBAL_GROUP` group whenever you add a user to a role.
  // Example:
  // Roles.addUsersToRoles(userId, ["admin"], Roles.GLOBAL_GROUP);
  // You can't mix and match adding with and without a group since
  // you will fail validation in some cases.
//  roles: { type: Object, optional: true, blackbox: true },
  // Option 2: [String] type
  // If you are sure you will never need to use role groups, then
  // you can specify [String] as the type
  roles: { type: Array, optional: true },
  'roles.$': { type: ConcreteRoleSchema },

  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: { type: Date, optional: true, autoform: { omit: true } },
});

Meteor.users.attachSchema(Meteor.users.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Meteor.users.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
