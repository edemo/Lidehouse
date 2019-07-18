import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { defaultRoles, Roles } from './roles.js';
import { Permissions } from './permissions.js';

export function initializePermissions() {
  defaultRoles.forEach(role => {
    const roleHasPermissions = [];
    Permissions.forEach(perm => {
      if (_.contains(perm.roles, role)) roleHasPermissions.push(perm.name);
    });
    Roles.upsert({ _id: role.name }, { $set: { ...role, permissions: roleHasPermissions } });
  });
}

if (Meteor.isServer) {
  Meteor.startup(() => initializePermissions());
}
