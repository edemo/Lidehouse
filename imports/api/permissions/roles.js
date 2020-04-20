import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

export const defaultRoles = [
  { name: 'admin' },        // Creator of the community. Can give out all other roles and take them back.
  { name: 'manager' },      // The manager (kk) of the community. Registers owners.
  { name: 'board' },        // same priviledges as manager (for now).
  { name: 'owner' },        // Title holder of a parcel. Has voting rights.
  { name: 'benefactor' },   // Uses the parcel. Owner handed over beneficiary rights to him/her.
  { name: 'overseer' },     // Can oversee financial trransactions.
  { name: 'accountant' },   // Can set the Account and Transaction structure.
  { name: 'treasurer' },    // Can add new financial trransactions.
  { name: 'maintainer' },   // Works on the reported errors. Sees them, can coment on them.
  { name: 'moderator' },    // Moderates the conversations on topics. Can remove comments.
  { name: 'delegate' },     // Can vote for someone else.
  { name: 'guest' },        // Just looking around. Somone invited him/her to take a look.
];

export const rolesPriorities = {};
_.each(defaultRoles, (r, i) => rolesPriorities[r.name] = i);
rolesPriorities.admin = rolesPriorities.moderator; // Needs to move to end of the officer list

// Groupings just to ease configuration
export const everyRole = defaultRoles.map(r => r.name);
export const everyBody = ['null']; // Even the not-logged-in user
export const exceptGuest = _.without(everyRole, 'guest');
export const exceptAdmin = _.without(everyRole, 'admin');
export const nobody = [];
export const occupantRoles = ['owner', 'benefactor'];
export const nonOccupantRoles = _.without(everyRole, occupantRoles);
export const leaderRoles = ['admin', 'manager', 'board'];
export const nonLeaderRoles = ['moderator', 'accountant', 'treasurer', 'overseer', 'maintainer'];
export const officerRoles = _.union(leaderRoles, nonLeaderRoles);
export const autoAssignedRoles = ['delegate', 'guest'];
export const votingRoles = ['owner', 'delegate'];

// =====================================

export const Roles = new Mongo.Collection('roles');

Roles.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
              // If not exist, that is a built-in role for all communities
  name: { type: String, max: 100 },
  permissions: { type: Array },
  'permissions.$': { type: String },
});

Roles.attachSchema(Roles.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Roles.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
