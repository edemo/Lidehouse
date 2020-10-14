import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import { UploadFS } from 'meteor/jalik:ufs';
import { Shareddocs } from './shareddocs.js';

export const ShareddocsStore = new GridFSStore({
  collection: Shareddocs,
  name: 'shareddocs',
  chunkSize: 1024 * 255,
});

// Setting up store permissions
ShareddocsStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return Shareddocs.hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return Shareddocs.hasPermissionToUpdate(userId, doc);
  },
  remove(userId, doc) {
    return Shareddocs.hasPermissionToRemoveUploaded(userId, doc);
  },
}));
