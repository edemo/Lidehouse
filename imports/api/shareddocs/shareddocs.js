import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { UploadFS } from 'meteor/jalik:ufs';
import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import './config.js';

// Declare store collection
export const Shareddocs = new Mongo.Collection('shareddocs');

function hasPermissionToUpload(userId, doc) {
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('shareddocs.upload', doc.communityId);
}

// Setting up collection permissions
Shareddocs.allow({
  insert(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  remove(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
});

// Declare store
const ShareddocsStore = new GridFSStore({
  collection: Shareddocs,
  name: 'shareddocs',
  chunkSize: 1024 * 255,
});

// Setting up store permissions
ShareddocsStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  remove(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
}));
