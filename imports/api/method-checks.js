import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Permissions } from '/imports/api/permissions/permissions.js';
import '/imports/api/users/users.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { canAddMemberWithRole } from '/imports/api/permissions/config.js';

export function checkLoggedIn(userId) {
  if (!userId) {
    throw new Meteor.Error('err_notLoggedIn',
      'Only logged in users can perform this activity.');
  }
}

export function checkExists(collection, predicate) {
  // Checks that a *collection* already contains a doc with given *objectId*
  const object = collection.findOne(predicate);
  if (!object) {
    throw new Meteor.Error('err_invalidId', 'No such object',
      `Collection: ${collection._name}, id: ${predicate}`
    );
  }
  return object;
}

export function checkNotExists(collection, predicate) {
  // Checks that a *collection* does not yet contain a doc with given *objectId*
  const object = collection.findOne(predicate);
  if (object) {
    throw new Meteor.Error('err_duplicateId', 'This id is already used',
      `Collection: ${collection._name}, id: ${predicate}`
    );
  }
}

export function checkPermissions(userId, permissionName, communityId, object) {
  // Checks that *user* has *permission* in given *community* to perform things on given *object*
  const user = Meteor.users.findOne(userId);
  if (!user.hasPermission(permissionName, communityId, object)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Permission: ${permissionName}, userId: ${userId}, communityId: ${communityId}, objectId: ${object._id}`);
  }
}

export function checkTopicPermissions(userId, permissionName, topic) {
  // Checks that *user* has *permission* to perform things on given *topic*
  const categoryPermissionName = `${topic.category}.${permissionName}`;
  const genericPermissionName = `topics.${permissionName}`;
  const categoryPermission = Permissions.findOne(categoryPermissionName);
  if (categoryPermission) {
    checkPermissions(userId, categoryPermission.name, topic.communityId, topic);
  } else {
    checkPermissions(userId, genericPermissionName, topic.communityId, topic);
  }
}

export function checkAddMemberPermissions(userId, communityId, roleOfNewMember) {
  // Checks that *user* has permission to add new member in given *community*
  if (roleOfNewMember === 'guest') return;  // TODO: who can join as guest? or only in Demo house?
  let permissioned = false;
  const rolesOfUser = Memberships.find({ userId, communityId }).map(m => m.role);
  rolesOfUser.forEach((role) => {
    if (_.contains(canAddMemberWithRole[role], roleOfNewMember)) permissioned = true;
  });
  if (!permissioned) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `roleOfNewMember: ${roleOfNewMember}, userId: ${userId}, communityId: ${communityId}`);
  }
}

export function checkModifier(object, modifier, modifiableFields, exclude = false) {
  // Checks that the *modifier* only tries to modify the *modifiableFields* on the given *object*
  let modifiedFields = Object.keys(modifier.$set);
  modifiedFields = _.without(modifiedFields, 'updatedAt');
  modifiedFields.forEach((mf) => {
    if ((exclude && _.contains(modifiableFields, mf) && object[mf] !== modifier.$set[mf])
      || (!exclude && !_.contains(modifiableFields, mf) && object[mf] !== modifier.$set[mf])) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Modifier: ${modifier.toString()}, field: ${mf}, object: ${object.toString()}`);
    }
  });
}
