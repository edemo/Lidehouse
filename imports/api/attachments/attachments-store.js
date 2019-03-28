import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import { UploadFS } from 'meteor/jalik:ufs';
import { Attachments } from './attachments.js';

export const AttachmentsStore = new GridFSStore({
  collection: Attachments,
  name: 'attachments',
  chunkSize: 1024 * 255,
});

// Setting up store permissions
AttachmentsStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return Attachments.hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return false;
  },
  remove(userId, doc) {
    return Attachments.hasPermissionToRemoveUploaded(userId, doc);
  },
}));
