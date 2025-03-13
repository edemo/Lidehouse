import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { UploadFS } from 'meteor/jalik:ufs';

import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Log } from '/imports/utils/log.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Sharedfolders } from './sharedfolders/sharedfolders.js';

import Compress from 'compress.js';
const compress = new Compress();

export const Shareddocs = new Mongo.Collection('shareddocs');

function permissionsByFolders(userId, doc, permissions) {
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  debugAssert(permissions.default, 'default folder permission required');
  const folder = Sharedfolders.findOne(doc.folderId);
  if (permissions[folder.content]) return user.hasPermission(permissions[folder.content], doc);
  else return user.hasPermission(permissions.default, doc);
}

Shareddocs.hasPermissionToUpload = function hasPermissionToUpload(userId, doc) {
  const permissions = {
    community: 'shareddocs.upload',
    voting: 'poll.insert',
    agenda: 'agendas.insert',
    default: 'shareddocs.upload',
    transaction: 'transactions.insert',
  };
  return permissionsByFolders(userId, doc, permissions);
};

Shareddocs.hasPermissionToUpdate = function hasPermissionToUpdate(userId, doc) {
  const permissions = {
    community: 'shareddocs.upload',
    voting: 'poll.update',
    agenda: 'agendas.update',
    default: 'shareddocs.upload',
    transaction: 'transactions.update',
  };
  return permissionsByFolders(userId, doc, permissions);
};

Shareddocs.hasPermissionToRemoveUploaded = function hasPermissionToRemoveUploaded(userId, doc) {
  const permissions = {
    community: 'shareddocs.remove',
    voting: 'poll.remove',
    agenda: 'agendas.remove',
    default: 'shareddocs.remove',
    transaction: 'transactions.remove',
  };
  return permissionsByFolders(userId, doc, permissions);
};

// Can be manipulated only through the ShareddocStore interface
Shareddocs.allow({
  insert() { return false; },
  update(userId, doc) {
    return Shareddocs.hasPermissionToUpdate(userId, doc);
  },
  remove(userId, doc) {
    return Shareddocs.hasPermissionToRemoveUploaded(userId, doc);
  },
});

Shareddocs.attachBehaviour(Timestamped);

//--------------------------------------

function uploadFile(file, extraFields) {
  // Prepare the file to insert in database, note that we don't provide a URL,
  // it will be set automatically by the uploader when file transfer is complete.
  const shareddoc = {
    name: file.name,
    size: file.size,
    type: file.type,
    ...extraFields,
  };

  // Create a new Uploader for this file
  const uploader = new UploadFS.Uploader({
    // This is where the uploader will save the file
    // since v0.6.7, you can pass the store instance or the store name directly
    store: 'shareddocs',
    // Optimize speed transfer by increasing/decreasing chunk size automatically
    adaptive: true,
    // Define the upload capacity (if upload speed is 1MB/s, then it will try to maintain upload at 80%, so 800KB/s)
    // (used only if adaptive = true)
    capacity: 0.8, // 80%
    // The size of each chunk sent to the server
    chunkSize: 8 * 1024, // 8k
    // The max chunk size (used only if adaptive = true)
    maxChunkSize: 128 * 1024, // 128k
    // This tells how many tries to do if an error occurs during upload
    maxTries: 5,
    // The File/Blob object containing the data
    data: file,
    // The document to save in the collection
    file: shareddoc,
    // The error callback
    onError(err, file) {
      Log.error(err);
    },
    onAbort(file) {
      Log.warning(file.name + ' upload has been aborted');
    },
    onComplete(file) {
      Log.info(file.name + ' has been uploaded');
    },
    onCreate(file) {
      Log.info(file.name + ' has been created with ID ' + file._id);
    },
    onProgress(file, progress) {
      Log.info(file.name + ' ' + (progress*100) + '% uploaded');
    },
    onStart(file) {
      Log.info(file.name + ' started');
    },
    onStop(file) {
      Log.info(file.name + ' stopped');
    },
  });

  // Starts the upload
  uploader.start();

  // Stops the upload
  // uploader.stop();

  // Abort the upload
  // uploader.abort();
}

Shareddocs.upload = function upload(extraFields) {
  UploadFS.selectFiles(function (file) {
    const MAX_IMAGE_MB = 0.5;
    if (file.type.startsWith('image') && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      compress.compress([file], {
        size: MAX_IMAGE_MB, // compress needs it in MB (while ufs size is in bytes)
        maxWidth: 1024,
        maxHeight: 1024,
      }).then((results) => {
        const img1 = results[0];
        const base64str = img1.data;
        const imgExt = img1.ext;
        const compressedFile = Compress.convertBase64ToFile(base64str, imgExt);
        compressedFile.name = file.name;
        uploadFile(compressedFile, extraFields);
      });
    } else { uploadFile(file, extraFields); }
  });
};
