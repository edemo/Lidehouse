import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Permissions } from '/imports/api/permissions/permissions.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';

export function checkConstraint(predicate, errorMessage) {
  if (!predicate) {
    throw new Meteor.Error('err_constraint', errorMessage);
  }
}

export function checkRegisteredUser(userId) {
  if (!userId) {
    throw new Meteor.Error('err_notLoggedIn',
      'Only logged in users can perform this activity');
  }
}

export function checkExists(collection, predicate) {
  // Checks that a *collection* already contains a doc with given *objectId*
  const object = collection.findOne(predicate);
  if (!object) {
    throw new Meteor.Error('err_notExists', 'No such object', `${collection._name}: ${predicate}`);
  }
  return object;
}

export function checkNotExists(collection, predicate) {
  // Checks that a *collection* does not yet contain a doc with given *objectId*
  const object = collection.findOne(predicate);
  if (object) {
    Log.error('Already has such object', collection._name, JSON.stringify(predicate), JSON.stringify(object));
    throw new Meteor.Error('err_alreadyExists', 'Already has such object', `${collection._name}: ${JSON.stringify(predicate)}`);
  }
}

export function checkUnique(collection, doc, idSetParam) {
//  Log.debug('checkUnique', doc);
//  Log.debug('from:', collection.find({}).fetch());
  const idSet = idSetParam || collection.idSet[0];
  const selector = _.pick(doc, ...idSet);
  selector._id = { $ne: doc._id }; // in case doc is already in the collection when we check (after stage update)
  checkNotExists(collection, selector);
}

export function checkPermissions(userId, permissionName, doc) {
  // Checks that *user* has *permission* in given *community* to perform things on given *object*
  const user = Meteor.users.findOneOrNull(userId);
  if (!user.hasPermission(permissionName, doc)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `${permissionName}, ${userId}, ${JSON.stringify(doc)}`);
  }
  return user;
}

export function checkPermissionsWithApprove(userId, permissionName, doc) {
  const user = Meteor.users.findOneOrNull(userId);
  if (user.hasPermission(permissionName, doc)) {
    doc.approved = true;
  } else if (user.hasPermission(permissionName + '.unapproved', doc)) {
    doc.approved = false;
  } else {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `${permissionName}, ${userId}, ${JSON.stringify(doc)}`);
  }
}

export function checkTopicPermissions(userId, permissionName, topic) {
  // Checks that *user* has *permission* to perform things on given *topic*
  let derivedPermissionName = `${topic.category}.${permissionName}`;
  if ((topic.category === 'vote') && (topic.vote.effect === 'poll')) {
    derivedPermissionName = `poll.${permissionName}`;
  }
  if (topic.category === 'ticket') derivedPermissionName = `${topic.ticket.type}.${permissionName}`;
  debugAssert(Permissions.find(perm => perm.name === derivedPermissionName), `No such permission found ${derivedPermissionName}`);
  checkPermissions(userId, derivedPermissionName, topic);
}

export function checkModifier(object, modifier, modifiableFields, exclude = false) {
  // Checks that the *modifier* only tries to modify the *modifiableFields* on the given *object*
  // if exclude === true, then the fields given, are the ones that should NOT be modified, and all other fields can be modified
  let modifiedFields = []; //Object.keys(modifier.$set);
  _.each(modifier, (modVal, modKey) => {
    _.each(modVal, (val, key) => {
      switch (modKey) {
        case '$set':         
          if (!_.isEqual(val, Object.getByString(object, key))) modifiedFields.push(key);
          break;
        case '$unset':         
          if (!_.isUndefined(Object.getByString(object, key))) modifiedFields.push(key);
          break;
        case '$push':         
        case '$pull':         
        case '$inc':         
          modifiedFields.push(key);
          break;
        default:
          throw new Meteor.Error('err_permissionDenied', 'Unrecognized modifier key',
            `Key: ${modKey}\n Modifier: ${JSON.stringify(modifier)}\n Object: ${JSON.stringify(object)}`);
      }
    });
  });
  modifiedFields = _.without(modifiedFields, 'updatedAt');
  modifiedFields.forEach((mf) => {
    if ((exclude && _.contains(modifiableFields, mf))
      || (!exclude && !_.contains(modifiableFields, mf) )) {
      throw new Meteor.Error('err_permissionDenied', 'Field is not modifiable',
        `Field: ${mf}\n Modifier: ${JSON.stringify(modifier)}\n Object: ${JSON.stringify(object)}`);
    }
  });
}

export function checkPermissionsToUpload(userId, collection, doc) {
  if (!collection.hasPermissionToUpload(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `${'Upload'}, ${userId}, ${JSON.stringify(doc)}`);
  }
}

export function checkPermissionsToRemoveUploaded(userId, collection, doc) {
  if (!collection.hasPermissionToRemoveUploaded(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `${'Remove upload'}, ${userId}, ${JSON.stringify(doc)}`);
  }
}

export function checkNeededStatus(doc, ...statuses) {
  if (!_.contains(statuses, doc.status)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity in this status',
      `Status: ${doc.status}, needed status: ${statuses}`);
  }
}
