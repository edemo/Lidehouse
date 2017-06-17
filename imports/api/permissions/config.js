/* eslint-disable no-multi-spaces */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

const defaultRoles = [
  { name: 'admin' },
  { name: 'manager' },
  { name: 'owner' },
  { name: 'tenant' },
  { name: 'moderator' },
  { name: 'accountant' },
  { name: 'treasurer' },
  { name: 'overseer' },
  { name: 'delegate' },
  { name: 'maintainer' },
  { name: 'guest' },
];

// Groupings just to ease configuration
const everybody = ['admin', 'manager', 'owner', 'tenant', 'moderator', 'accountant', 'treasurer', 'overseer', 'delegate', 'maintainer', 'guest'];
const exceptGuest = ['admin', 'manager', 'owner', 'tenant', 'moderator', 'accountant', 'treasurer', 'overseer', 'maintainer', 'delegate'];
const nobody = [];

const permissions = [
  { name: 'communities.insert',   type: 'edit', roles: everybody },
  { name: 'communities.update',   type: 'edit', roles: ['admin'] },
  { name: 'communities.listing',  type: 'view', roles: everybody },
  { name: 'memberships.insert',   type: 'edit', roles: ['admin', 'manager', 'owner'] },
  { name: 'memberships.listing',  type: 'edit', roles: exceptGuest },
  { name: 'topics.insert.forum',  type: 'edit', roles: everybody },
  { name: 'topics.insert.prevote', type: 'edit', roles: ['owner'] },
  { name: 'topics.insert.vote',   type: 'edit', roles: ['manager'] },
  { name: 'topics.insert.news',   type: 'edit', roles: ['manager'] },
  { name: 'topics.insert.ticket', type: 'edit', roles: exceptGuest },
  { name: 'topics.update.forum',  type: 'edit', roles: nobody, allowAuthor: true },
  { name: 'topics.update.prevote', type: 'edit', roles: nobody },
  { name: 'topics.update.vote',   type: 'edit', roles: nobody },
  { name: 'topics.update.news',   type: 'edit', roles: ['manager'] },
  { name: 'topics.update.ticket', type: 'edit', roles: ['manager'] },
  { name: 'topics.remove',        type: 'edit', roles: ['moderator'], allowAuthor: true },
  { name: 'topics.vote',          type: 'edit', roles: ['owner'] },
  { name: 'topics.listing',       type: 'edit', roles: exceptGuest },
  { name: 'comments.insert',      type: 'edit', roles: exceptGuest },
  { name: 'comments.update',      type: 'edit', roles: nobody, allowAuthor: true },
  { name: 'comments.remove',      type: 'edit', roles: ['moderator'], allowAuthor: true },
  { name: 'comments.listing',     type: 'edit', roles: exceptGuest },
  { name: 'accounts.insert',      type: 'edit', roles: ['accountant'] },
  { name: 'accounts.update',      type: 'edit', roles: ['accountant'] },
  { name: 'accounts.remove',      type: 'edit', roles: ['accountant'] },
  { name: 'accounts.listing',     type: 'edit', roles: ['accountant', 'treasurer', 'overseer'] },
  { name: 'payments.insert',      type: 'edit', roles: ['treasurer'] },
  { name: 'payments.update',      type: 'edit', roles: ['treasurer'] },
  { name: 'payments.remove',      type: 'edit', roles: ['treasurer'] },
  { name: 'payments.listing',     type: 'edit', roles: ['accountant', 'treasurer', 'overseer'] },
  { name: 'shareddocs.upload',    type: 'edit', roles: ['manager'] },
  { name: 'shareddocs.download',  type: 'view', roles: exceptGuest },
  { name: 'shareddocs.listing',   type: 'view', roles: exceptGuest },
];

if (Meteor.isServer) {
  Meteor.startup(function InitializeRoles() {
    defaultRoles.forEach(role => Roles.upsert({ _id: role.name }, { $set: _.extend(role, { protected: true }) }));
  });

  Meteor.startup(function InitializePermissions() {
    permissions.forEach(permission => Permissions.upsert({ _id: permission.name }, { $set: permission }));
  });
}
