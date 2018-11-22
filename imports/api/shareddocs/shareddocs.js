import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { UploadFS } from 'meteor/jalik:ufs';
import { GridFSStore } from 'meteor/jalik:ufs-gridfs';
import { _ } from 'meteor/underscore';
import './config.js';

// Declare store collection
export const Shareddocs = new Mongo.Collection('shareddocs');

export function hasPermissionToUpload(userId, doc) {
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  if (doc.folderId === 'community' || doc.folderId === 'main') return user.hasPermission('shareddocs.upload', doc.communityId, doc);
  else if (doc.folderId === 'voting') return user.hasPermission('poll.insert', doc.communityId, doc);
  else if (doc.folderId === 'agenda') return user.hasPermission('agendas.insert', doc.communityId, doc);
  else if (doc.folderId === 'decision') return false;
  else return user.hasPermission('shareddocs.upload', doc.communityId, doc);
}

export function hasPermissionToRemoveUploaded(userId, doc) {
  if (Meteor.isServer) return true;
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  if (doc.folderId === 'community' || doc.folderId === 'main') return user.hasPermission('shareddocs.upload', doc.communityId, doc);
  else if (doc.folderId === 'voting') return user.hasPermission('poll.remove', doc.communityId, doc);
  else if (doc.folderId === 'agenda') return user.hasPermission('agendas.remove', doc.communityId, doc);
  else if (doc.folderId === 'decision') return false;
  else return user.hasPermission('shareddocs.upload', doc.communityId, doc);
}

// Can be manipulated only through the ShareddocStore interface
Shareddocs.allow({
  insert() { return false; },
  update() { return false; },
  remove(userId, doc) {
    return hasPermissionToRemoveUploaded(userId, doc);
  },
});

// Declare store
export const ShareddocsStore = new GridFSStore({
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
    return false;
  },
  remove(userId, doc) {
    return hasPermissionToRemoveUploaded(userId, doc);
  },
}));

Shareddocs.upload = function upload(extraFields) {
  UploadFS.selectFiles(function (file) {
    // Prepare the file to insert in database, note that we don't provide a URL,
    // it will be set automatically by the uploader when file transfer is complete.
    const shareddoc = _.extend({
      name: file.name,
      size: file.size,
      type: file.type,
    }, extraFields);

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
        console.error(err);
      },
      onAbort(file) {
        console.log(file.name + ' upload has been aborted');
      },
      onComplete(file) {
        console.log(file.name + ' has been uploaded');
      },
      onCreate(file) {
        console.log(file.name + ' has been created with ID ' + file._id);
      },
      onProgress(file, progress) {
        console.log(file.name + ' ' + (progress*100) + '% uploaded');
      },
      onStart(file) {
        console.log(file.name + ' started');
      },
      onStop(file) {
        console.log(file.name + ' stopped');
      },
    });

    // Starts the upload
    uploader.start();

    // Stops the upload
    // uploader.stop();

    // Abort the upload
    // uploader.abort();
  });
};
