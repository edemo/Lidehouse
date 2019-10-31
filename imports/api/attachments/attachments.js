import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Attachments = new Mongo.Collection('attachments');

Attachments.hasPermissionToUpload = function hasPermissionToUpload(userId, doc) {
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('attachments.upload', doc.communityId, doc);
};

Attachments.hasPermissionToRemoveUploaded = function hasPermissionToRemoveUploaded(userId, doc) {
  if (Meteor.isServer) return true;
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('attachments.remove', doc.communityId, doc);
};

// Can be manipulated only through the AttachmentsStore interface
Attachments.allow({
  insert() { return false; },
  update() { return false; },
  remove(userId, doc) {
    return Attachments.hasPermissionToRemoveUploaded(userId, doc);
  },
});

Attachments.helpers({
  remove() {
    Attachments.remove(this._id);
  },
});

Attachments.attachBehaviour(Timestamped);
