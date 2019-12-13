import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Permissions } from '/imports/api/permissions/permissions.js';
import { debugAssert } from '/imports/utils/assert.js';

export function checkConstraint(predicate, errorMessage) {
  if (!predicate) {
    throw new Meteor.Error('err_constraint', errorMessage);
  }
}

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
    throw new Meteor.Error('err_notExists', 'No such object',
      `Collection: ${collection._name}, predicate: ${predicate}`
    );
  }
  return object;
}

export function checkNotExists(collection, predicate) {
  // Checks that a *collection* does not yet contain a doc with given *objectId*
  const object = collection.findOne(predicate);
  if (object) {
    throw new Meteor.Error('err_alreadyExists', 'Already has such object',
      `Collection: ${collection._name}, predicate: ${JSON.stringify(predicate)}` 
    );
  }
}

export function checkPermissions(userId, permissionName, communityId, object) {
  // Checks that *user* has *permission* in given *community* to perform things on given *object*
  const user = Meteor.users.findOneOrNull(userId);
  if (!user.hasPermission(permissionName, communityId, object)) {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to perform this activity: ${permissionName}, userId: ${userId}, communityId: ${communityId}, objectId: ${object ? object._id : '-'}`);
  }
}

export function checkPermissionsWithApprove(userId, permissionName, communityId, object) {
  const user = Meteor.users.findOneOrNull(userId);
  if (user.hasPermission(permissionName, communityId, object)) {
    object.approved = true;
  } else if (user.hasPermission(permissionName + '.unapproved', communityId, object)) {
    object.approved = false;
  } else {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to perform this activity: ${permissionName}, userId: ${userId}, communityId: ${communityId}, objectId: ${object ? object._id : '-'}`);
  }
}

export function checkTopicPermissions(userId, permissionName, topic) {
  // Checks that *user* has *permission* to perform things on given *topic*
  let derivedPermissionName = `${topic.category}.${permissionName}`;
  if ((topic.category === 'vote') && (topic.vote.effect === 'poll')) {
    derivedPermissionName = `poll.${permissionName}`;
  }
  if (topic.category === 'ticket') derivedPermissionName = `${topic.ticket.type}.${permissionName}`;
  debugAssert(Permissions.find(perm => perm.name === derivedPermissionName));
  checkPermissions(userId, derivedPermissionName, topic.communityId, topic);
}

export function checkModifier(object, modifier, modifiableFields, exclude = false) {
  // Checks that the *modifier* only tries to modify the *modifiableFields* on the given *object*
  // if exclude === true, then the fields given, are the ones that should NOT be modified, and all other fields can be modified
  let modifiedFields = Object.keys(modifier.$set);
  modifiedFields = _.without(modifiedFields, 'updatedAt');
  modifiedFields.forEach((mf) => {
    if ((exclude && _.contains(modifiableFields, mf) && !_.isEqual(Object.getByString(object, mf), modifier.$set[mf]))
      || (!exclude && !_.contains(modifiableFields, mf) && !_.isEqual(Object.getByString(object, mf), modifier.$set[mf]))) {
      throw new Meteor.Error('err_permissionDenied',
        `Field is not modifiable, Field: ${mf}\n Modifier: ${JSON.stringify(modifier)}\n Object: ${JSON.stringify(object)}`);
    }
  });
}

export function checkPermissionsToUpload(userId, collection, doc) {
  if (!collection.hasPermissionToUpload(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to perform this activity: ${"Upload"}, userId: ${userId}, communityId: ${doc.communityId}, folderId: ${doc.folderId}`);
  }
}

export function checkPermissionsToRemoveUploaded(userId, collection, doc) {
  if (!collection.hasPermissionToRemoveUploaded(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to perform this activity: ${"Remove"}, userId: ${userId}, communityId: ${doc.communityId}, folderId: ${doc.folderId}`);
  }
}

export function checkNeededStatus(status, doc) {
  if (status !== doc.status) {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to perform this activity in this status: ${doc.status}, needed status: ${status}`);
  }
}
