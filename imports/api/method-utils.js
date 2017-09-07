import { Meteor } from 'meteor/meteor';
import { Permissions } from '/imports/api/permissions/permissions.js';
import '/imports/api/users/users.js';

export function checkExists(collection, objectId) {
  const object = collection.findOne(objectId);
  if (!object) {
    throw new Meteor.Error('err_invalidId', 'No such object',
      `Collection: ${collection._name}, id: ${objectId}`
    );
  }
  return object;
}

export function checkNotExists(collection, objectId) {
  const object = collection.findOne(objectId);
  if (!object) {
    throw new Meteor.Error('err_duplicateId', 'This id is already used',
      `Collection: ${collection._name}, id: ${objectId}`
    );
  }
}

export function checkPermissions(userId, permissionName, communityId, object) {
  const user = Meteor.users.findOne(userId);
  if (!user.hasPermission(permissionName, communityId, object)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Permission: ${permissionName}, userId: ${this.userId}, communityId: ${communityId}, objectId: ${object._id}`);
  }
}

export function checkTopicPermissions(userId, permissionName, topic) {
  const categoryPermissionName = `${topic.category}.${permissionName}`;
  const genericPermissionName = `topics.${permissionName}`;
  const categoryPermission = Permissions.findOne(categoryPermissionName);
  if (categoryPermission) {
    checkPermissions(userId, categoryPermission.name, topic.communityId, topic);
  } else {
    checkPermissions(userId, genericPermissionName, topic.communityId, topic);
  }
}

export function checkModifier(object, modifier, modifiableFields) {
  const modifiedFields = Object.keys(modifier.$set);
  modifiedFields.forEach((mf) => {
    if (!modifiableFields.contains(mf) && object[mf] !== modifier.$set[mf]) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Modifier: ${modifier}, object: ${object}`);
    }
  });
}
