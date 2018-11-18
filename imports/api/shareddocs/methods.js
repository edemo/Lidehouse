import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Shareddocs, hasPermissionToUpload, hasPermissionToRemoveUploaded } from '/imports/api/shareddocs/shareddocs.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

function checkPermissionsToUpload(userId, doc) {
  if (!hasPermissionToUpload(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Permission: ${"Upload"}, userId: ${userId}, communityId: ${doc.communityId}, folderId: ${doc.folderId}`);
  }
}

function checkPermissionsToRemoveUploaded(userId, doc) {
  if (!hasPermissionToRemoveUploaded(userId, doc)) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Permission: ${"Remove"}, userId: ${userId}, communityId: ${doc.communityId}, folderId: ${doc.folderId}`);
  }
}

export const update = new ValidatedMethod({
  name: 'shareddocs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Shareddocs, _id);
    checkModifier(doc, modifier, ['folderId']);
    checkNotExists(Shareddocs, { _id: { $ne: doc._id }, communityId: doc.communityId, folderId: modifier.$set.folderId, name: doc.name });
    checkPermissionsToUpload(this.userId, doc); 

    Shareddocs.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'shareddocs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Shareddocs, _id);
    checkPermissionsToRemoveUploaded(this.userId, doc);

    Shareddocs.remove(_id);
  },
});

export function cleanCanceledVoteAttachments() {
  Shareddocs.remove({ $where: 'this.topicId === this.userId' });
  // Using $expr would be faster, but only mongo 3.6 supports it (and currently we are on 3.4)
  // Shareddocs.remove({ $expr: { $eq: ['$topicId', '$userId'] } });
}
