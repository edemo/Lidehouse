/* eslint-disable no-multi-spaces */
import { Meteor } from 'meteor/meteor';
import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

const roles = [
  { name: 'admin' },
  { name: 'manager' },
  { name: 'member' },
  { name: 'accountant' },
  { name: 'overseer' },
  { name: 'delegate' },
  { name: 'guest' },
];

// Groupings just to ease configuration
const everybody = ['admin', 'manager', 'member', 'accountant', 'overseer', 'delegate', 'guest'];
const exceptGuest = ['admin', 'manager', 'member', 'accountant', 'overseer', 'delegate'];

const permissions = [
  { name: 'communities.listing',  type: 'view', roles: everybody },
  { name: 'communities.create',   type: 'edit', roles: exceptGuest },
  { name: 'communities.update',   type: 'edit', roles: ['admin'] },
];

if (Meteor.isServer) {
  Meteor.startup(function InitializeRoles() {
    Roles.remove({});
    roles.forEach(role => Roles.insert(role));
  });

  Meteor.startup(function InitializePermissions() {
    Permissions.remove({});
    permissions.forEach(permission => Permissions.insert(permission));
  });
}
