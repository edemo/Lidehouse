import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { UploadFS } from 'meteor/jalik:ufs';
import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import './config.js';

// Declare store collection
export const Shareddocs = new Mongo.Collection('shareddocs');

// Declare store
const ShareddocsStore = new GridFSStore({
  collection: Shareddocs,
  name: 'shareddocs',
  chunkSize: 1024 * 255,
});

// Setting up store permissions
ShareddocsStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    if (!userId) return false;
    const user = Meteor.users.findOne(userId);
    return user.hasPermission('shareddocs.upload', doc.communityId);
  },
  update(userId, doc) {
    return userId === doc.userId;
  },
  remove(userId, doc) {
    return userId === doc.userId;
  },
}));
