import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import { UploadFS } from 'meteor/jalik:ufs';
import { Attachments } from './attachments.js';

export const AttachmentsStore = new GridFSStore({
  collection: Attachments,
  name: 'attachments',
  chunkSize: 1024 * 255,
  filter: new UploadFS.Filter({
    maxSize: 5000000, // 5MB,
  }),
});

// different store for same collection with different filter
export const PhotoStore = new GridFSStore({
  collection: Attachments,
  name: 'photo',
  chunkSize: 1024 * 255,
  filter: new UploadFS.Filter({
    contentTypes: ['image/*'],
  }),
});

// Setting up store permissions
AttachmentsStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return Attachments.hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return Attachments.hasPermissionToUpdate(userId, doc);
  },
  remove(userId, doc) {
    return Attachments.hasPermissionToRemoveUploaded(userId, doc);
  },
}));

PhotoStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return Attachments.hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return Attachments.hasPermissionToUpdate(userId, doc);
  },
  remove(userId, doc) {
    return Attachments.hasPermissionToRemoveUploaded(userId, doc);
  },
}));
