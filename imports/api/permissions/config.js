/* eslint-disable no-multi-spaces */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

const defaultRoles = [
  { name: 'admin' },
  { name: 'manager' },
  { name: 'owner' },
  { name: 'accountant' },
  { name: 'overseer' },
  { name: 'delegate' },
  { name: 'guest' },
];

// Groupings just to ease configuration
const everybody = ['admin', 'manager', 'owner', 'accountant', 'overseer', 'delegate', 'guest'];
const exceptGuest = ['admin', 'manager', 'owner', 'accountant', 'overseer', 'delegate'];

const permissions = [
  { name: 'communities.create',   type: 'edit', roles: exceptGuest },
  { name: 'communities.update',   type: 'edit', roles: ['admin'] },
  { name: 'communities.listing',  type: 'view', roles: everybody },
  { name: 'shareddocs.upload',     type: 'edit', roles: ['admin', 'manager'] },
  { name: 'shareddocs.download',   type: 'view', roles: exceptGuest },
];

if (Meteor.isServer) {
  Meteor.startup(function InitializeRoles() {
    defaultRoles.forEach(role => Roles.upsert({ _id: role.name }, { $set: _.extend(role, { protected: true }) }));
  });

  Meteor.startup(function InitializePermissions() {
    permissions.forEach(permission => Permissions.upsert({ _id: permission.name }, { $set: permission }));
  });
}
