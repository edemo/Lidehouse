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

export const canAddMemberWithRole = {
  admin: everybody,
  manager: ['owner'],
  owner: ['tenant'],
};

const permissions = [
  { name: 'communities.insert',     roles: everybody },
  { name: 'communities.update',     roles: ['admin'] },
  { name: 'communities.listing',    roles: everybody },
  { name: 'memberships.listing',    roles: exceptGuest },
  { name: 'forum.insert',           roles: exceptGuest },
  { name: 'forum.update',           roles: nobody, allowAuthor: true },
  { name: 'forum.remove',           roles: ['moderator'], allowAuthor: true },
  { name: 'prevote.insert',         roles: ['owner'] },
  { name: 'prevote.update',         roles: nobody },
  { name: 'prevote.remove',         roles: nobody, allowAuthor: true },
  { name: 'vote.insert',            roles: ['manager'] },
  { name: 'vote.update',            roles: nobody },
  { name: 'vote.remove',            roles: ['manager'] },
  { name: 'vote.cast.update',       roles: ['owner', 'delegate'] },
  { name: 'vote.close.update',      roles: ['manager'] },
  { name: 'news.insert',            roles: ['manager'] },
  { name: 'news.update',            roles: ['manager'] },
  { name: 'news.remove',            roles: ['manager'] },
  { name: 'ticket.insert',          roles: exceptGuest },
  { name: 'ticket.update',          roles: ['manager', 'maintainer'], allowAuthor: true },
  { name: 'ticket.remove',          roles: ['manager', 'maintainer'], allowAuthor: true },
  { name: 'room.insert',            roles: everybody },
  { name: 'room.update',            roles: nobody },
  { name: 'feedback.insert',        roles: everybody },
  { name: 'feedback.update',        roles: nobody },
  { name: 'topics.listing',         roles: exceptGuest },
  { name: 'comments.insert',        roles: exceptGuest },
  { name: 'comments.update',        roles: nobody, allowAuthor: true },
  { name: 'comments.remove',        roles: ['moderator'], allowAuthor: true },
  { name: 'comments.listing',       roles: exceptGuest },
  { name: 'finances.view',          roles: exceptGuest },
  { name: 'payaccounts.insert',     roles: ['accountant'] },
  { name: 'payaccounts.update',     roles: ['accountant'] },
  { name: 'payaccounts.remove',     roles: ['accountant'] },
  { name: 'payaccounts.listing',    roles: ['accountant', 'treasurer', 'overseer'] },
  { name: 'payments.insert',        roles: ['treasurer'] },
  { name: 'payments.update',        roles: ['treasurer'] },
  { name: 'payments.remove',        roles: ['treasurer'] },
  { name: 'payments.listing',       roles: ['accountant', 'treasurer', 'overseer'] },
  { name: 'shareddocs.upload',      roles: ['manager'] },
  { name: 'shareddocs.download',    roles: exceptGuest },
  { name: 'shareddocs.listing',     roles: exceptGuest },
];

export function initializePermissions() {
  defaultRoles.forEach(role => Roles.upsert({ _id: role.name }, { $set: _.extend(role, { protected: true }) }));
  permissions.forEach(permission => Permissions.upsert({ _id: permission.name }, { $set: permission }));
}

if (Meteor.isServer) {
  Meteor.startup(() => initializePermissions());
}
