// Default config from https://github.com/jalik/jalik-ufs/
import { UploadFS } from 'meteor/jalik:ufs';

// Set default permissions for all stores (you can later overwrite the default permissions on each store)
UploadFS.config.defaultStorePermissions = new UploadFS.StorePermissions({
  insert(userId, doc) {
    return userId;
  },
  update(userId, doc) {
    return userId === doc.creatorId;
  },
  remove(userId, doc) {
    return userId === doc.creatorId;
  },
});

// Use HTTPS in URLs
UploadFS.config.https = false;

// Activate simulation for slowing file reading
UploadFS.config.simulateReadDelay = 1000; // 1 sec

// Activate simulation for slowing file uploading
UploadFS.config.simulateUploadSpeed = 128000; // 128kb/s

// Activate simulation for slowing file writing
UploadFS.config.simulateWriteDelay = 2000; // 2 sec

// This path will be appended to the site URL, be sure to not put a "/" as first character
// for example, a PNG file with the _id 12345 in the "photos" store will be available via this URL :
// http://www.yourdomain.com/uploads/photos/12345.png
UploadFS.config.storesPath = 'uploads';

// Set the temporary directory where uploading files will be saved
// before sent to the store.
UploadFS.config.tmpDir = './tmp/uploads';

// Set the temporary directory permissions.
UploadFS.config.tmpDirPermissions = '0777';
