/* eslint-disable no-multi-spaces */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

export const defaultRoles = [
  { name: 'admin' },        // Creator of the community. Can give out all other roles and take them back.
  { name: 'manager' },      // The manager (kk) of the community. Registers owners.
  { name: 'owner' },        // Title holder of a parcel. Has voting rights.
  { name: 'benefactor' },   // Uses the parcel. Owner handed over beneficiary rights to him/her.
  { name: 'moderator' },    // Moderates the conversations on topics. Can remove comments.
  { name: 'accountant' },   // Can set the PayAccount structure.
  { name: 'treasurer' },    // Can add new financial transactions.
  { name: 'overseer' },     // Can oversee financial transactions.
  { name: 'delegate' },     // Can vote for someone else.
  { name: 'maintainer' },   // Works on the reported errors. Sees them, can coment on them.
  { name: 'guest' },        // Just poking around. Somone invited him/her to take a look.
];

// Groupings just to ease configuration
export const everybody = defaultRoles.map(r => r.name);
const exceptGuest = _.without(everybody, 'guest');
const nobody = [];

export const canAddMemberWithRole = {
  admin: everybody,
  manager: ['owner', 'benefactor'],
  owner: ['benefactor'],
};

const permissions = [
//  { name: 'communities.insert',     roles: everybody },
  { name: 'communities.update',     roles: ['admin'] },
  { name: 'communities.listing',    roles: everybody },
  { name: 'memberships.listing',    roles: exceptGuest },
  { name: 'roleships.update',       roles: ['admin', 'manager'] },
  { name: 'ownerships.update',      roles: ['admin', 'manager'] },
  { name: 'benefactorships.update', roles: ['admin', 'manager', 'owner'] },
  { name: 'parcels.listing',        roles: exceptGuest },
  { name: 'parcels.update',         roles: ['admin', 'manager'] },
  { name: 'parcels.assign',         roles: ['admin', 'manager'] },
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
