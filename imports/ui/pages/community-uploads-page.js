import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { UploadFS } from 'meteor/jalik:ufs';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import './community-uploads-page.html';

Template.Community_uploads_page.onCreated(function () {
  this.getCommunityId = () => FlowRouter.getParam('_cid');
  this.autorun(() => {
    this.subscribe('shareddocs.inCommunity', this.getCommunityId());
  });
});

Template.Community_uploads_page.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
  shareddocs() {
    return Shareddocs.find({});
  },
});

Template.Community_uploads_page.events({
  'click button[name=upload]'(event) {
    UploadFS.selectFiles(function (file) {
      // Prepare the file to insert in database, note that we don't provide a URL,
      // it will be set automatically by the uploader when file transfer is complete.
      const shareddoc = {
        name: file.name,
        size: file.size,
        type: file.type,
        communityId: Session.get('activeCommunityId'),
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
  },
  'click .js-delete'() {
    Shareddocs.remove(this._id);
  },
});
