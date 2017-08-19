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
  { name: 'forum.insert',         type: 'edit', roles: everybody },
  { name: 'forum.update',         type: 'edit', roles: nobody },
  { name: 'prevote.insert',       type: 'edit', roles: ['owner'] },
  { name: 'prevote.update',       type: 'edit', roles: nobody },
  { name: 'vote.insert',          type: 'edit', roles: ['manager'] },
  { name: 'vote.update',          type: 'edit', roles: nobody },
  { name: 'news.insert',          type: 'edit', roles: ['manager'] },
  { name: 'news.update',          type: 'edit', roles: ['manager'] },
  { name: 'ticket.insert',        type: 'edit', roles: exceptGuest },
  { name: 'ticket.update',        type: 'edit', roles: ['manager'] },
  { name: 'room.insert',          type: 'edit', roles: everybody },
  { name: 'room.update',          type: 'edit', roles: nobody },
  { name: 'feedback.insert',      type: 'edit', roles: everybody },
  { name: 'feedback.update',      type: 'edit', roles: nobody },
  { name: 'topics.remove',        type: 'edit', roles: ['moderator'], allowAuthor: true },
  { name: 'topics.castVote',      type: 'edit', roles: ['owner'] },
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

export function initializePermissions() {
  console.log('>>> roles');
  defaultRoles.forEach(role => Roles.upsert({ _id: role.name }, { $set: _.extend(role, { protected: true }) }));
  permissions.forEach(permission => Permissions.upsert({ _id: permission.name }, { $set: permission }));
}

if (Meteor.isServer) {
  Meteor.startup(() => initializePermissions());
}
