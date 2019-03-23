import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import { UploadFS } from 'meteor/jalik:ufs';
import { Images } from './images.js';

export const ImagesStore = new GridFSStore({
  collection: Images,
  name: 'images',
  chunkSize: 1024 * 255,
});

// Setting up store permissions
ImagesStore.setPermissions(new UploadFS.StorePermissions({
  insert(userId, doc) {
    return Images.hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return false;
  },
  remove(userId, doc) {
    return Images.hasPermissionToRemoveUploaded(userId, doc);
  },
}));
