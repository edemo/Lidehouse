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
  { name: 'maintainer' },   // Works on the reported errors. Sees them, can coment on them.
  { name: 'delegate' },     // Can vote for someone else.
  { name: 'guest' },        // Just poking around. Somone invited him/her to take a look.
];

// Groupings just to ease configuration
export const ownershipRoles = ['owner', 'benefactor'];
export const leaderRoles = ['admin', 'manager'];
export const nonLeaderRoles = ['moderator', 'accountant', 'treasurer', 'overseer', 'maintainer'];
export const officerRoles = _.union(leaderRoles, nonLeaderRoles);
export const autoAssignedRoles = ['delegate', 'guest'];
export const everyRole = defaultRoles.map(r => r.name);
const everyBody = ['null']; // Even the not-logged-in user
const exceptGuest = _.without(everyRole, 'guest');
const nobody = [];

const permissions = [
  { name: 'communities.details',    roles: exceptGuest },
//  { name: 'communities.insert',     roles: everyRole },
  { name: 'communities.update',     roles: ['admin'] },
  { name: 'communities.remove',     roles: ['admin'] },
  { name: 'memberships.inCommunity',roles: everyRole },
  { name: 'roleships.insert',       roles: ['admin', 'manager'] },
  { name: 'roleships.update',       roles: ['admin', 'manager'] },
  { name: 'roleships.remove',       roles: ['admin', 'manager'] },
  { name: 'ownerships.insert',      roles: ['admin', 'manager'] },
  { name: 'ownerships.update',      roles: ['admin', 'manager'] },
  { name: 'ownerships.remove',      roles: ['admin', 'manager'] },
  { name: 'benefactorships.insert', roles: ['admin', 'manager', 'owner'] },
  { name: 'benefactorships.update', roles: ['admin', 'manager', 'owner'] },
  { name: 'benefactorships.remove', roles: ['admin', 'manager', 'owner'] },
  { name: 'parcels.inCommunity',    roles: everyBody },
  { name: 'parcels.insert',         roles: ['admin', 'manager'] },
  { name: 'parcels.update',         roles: ['admin', 'manager'] },
  { name: 'parcels.remove',         roles: ['admin', 'manager'] },
  { name: 'forum.insert',           roles: exceptGuest },
  { name: 'forum.update',           roles: nobody, allowAuthor: true },
  { name: 'forum.remove',           roles: ['moderator'], allowAuthor: true },
//  { name: 'poll.insert',            roles: ['owner'] },
//  { name: 'poll.update',            roles: nobody },
//  { name: 'poll.remove',            roles: nobody, allowAuthor: true },
  { name: 'vote.insert',            roles: ['manager'] },
  { name: 'vote.update',            roles: ['manager'], allowAuthor: true },
  { name: 'vote.remove',            roles: ['manager'], allowAuthor: true },
  { name: 'vote.cast',              roles: ['owner', 'delegate', 'manager'] },
  { name: 'vote.castForOthers',     roles: ['manager'] },
  { name: 'vote.close',             roles: ['manager'] },
  { name: 'agendas.insert',         roles: ['manager'] },
  { name: 'agendas.update',         roles: ['manager'] },
  { name: 'agendas.remove',         roles: ['manager'] },
  { name: 'delegations.inCommunity',roles: ['manager'] },
  { name: 'delegations.forOthers',  roles: ['manager'] },
//  { name: 'delegations.update',     roles: nobody, allowAuthor: true },
//  { name: 'delegations.remove',     roles: nobody, allowAuthor: true },
  { name: 'news.insert',            roles: ['manager'] },
  { name: 'news.update',            roles: ['manager'] },
  { name: 'news.remove',            roles: ['manager'] },
  { name: 'ticket.insert',          roles: exceptGuest },
  { name: 'ticket.update',          roles: ['manager', 'maintainer'], allowAuthor: true },
  { name: 'ticket.remove',          roles: ['manager', 'maintainer'], allowAuthor: true },
  { name: 'room.insert',            roles: everyRole },
  { name: 'room.update',            roles: nobody },
  { name: 'feedback.insert',        roles: everyRole },
  { name: 'feedback.update',        roles: nobody },
  { name: 'topics.listing',         roles: exceptGuest },
  { name: 'comments.insert',        roles: exceptGuest },
  { name: 'comments.update',        roles: nobody, allowAuthor: true },
  { name: 'comments.remove',        roles: ['moderator'], allowAuthor: true },
  { name: 'comments.listing',       roles: exceptGuest },
  { name: 'like.toggle',            roles: exceptGuest },
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
];

/* what if more compacted...
const permissions = [
  // Read permissions ('read.publication.name')
  { name: 'read.communities.details',    roles: exceptGuest },
  { name: 'read.memberships.inCommunity',roles: everyRole },
  { name: 'read.parcels.inCommunity',    roles: everyBody },
  { name: 'read.delegations.inCommunity',roles: ['manager'] },
  { name: 'read.topics        ',         roles: exceptGuest },
  { name: 'read.comments',               roles: exceptGuest },
  { name: 'read.payaccounts',            roles: exceptGuest },
  { name: 'read.payments',               roles: exceptGuest },
  { name: 'read.shareddocs',             roles: exceptGuest },

  // Write permissions ('write.collection.method')
  { name: 'write.community',        roles: ['admin'] },
  { name: 'write.roleships',        roles: ['admin'] },
  { name: 'write.ownerships',       roles: ['admin', 'manager'] },
  { name: 'write.benefactorships',  roles: ['admin', 'manager'] },
  { name: 'write.parcels',          roles: ['manager'] },
  { name: 'create.forum.topics',    roles: exceptGuest },
  { name: 'write.forum.topics',     roles: ['moderator'] },
  { name: 'write.poll.vote.topics', roles: ['owner', 'manager'] },
  { name: 'write.legal.vote.topics',roles: ['manager'] },
  { name: 'write.agendas',          roles: ['manager'] },
  { name: 'write.delegations',      roles: ['manager'] },   // for others (people can naturally write their own delagations)
  { name: 'write.news.topics',      roles: ['manager'] },
  { name: 'create.tickets',         roles: exceptGuest },
  { name: 'write.tickets',          roles: ['manager', 'maintainer'] },
  { name: 'create.room.topic',      roles: everyRole },
  { name: 'create.feedback.topic',  roles: everyRole },
  { name: 'create.comments',        roles: exceptGuest },
  { name: 'write.comments',         roles: ['moderator'] },
  { name: 'write.payaccounts',      roles: ['accountant'] },
  { name: 'write.payments',         roles: ['treasurer'] },
  { name: 'write.shareddocs',       roles: ['manager'] },

  { name: 'vote.cast',              roles: ['owner', 'delegate', 'manager'] },
  { name: 'vote.castForOthers',     roles: ['manager'] },
  { name: 'vote.close',             roles: ['manager'] },
];
*/

export function initializePermissions() {
  defaultRoles.forEach(role => Roles.upsert({ _id: role.name }, { $set: _.extend(role, { protected: true }) }));
  permissions.forEach(permission => Permissions.upsert({ _id: permission.name }, { $set: permission }));
}

if (Meteor.isServer) {
  Meteor.startup(() => initializePermissions());
}
