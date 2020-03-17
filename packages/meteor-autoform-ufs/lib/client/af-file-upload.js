import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { isHostedByUs, link2doc } from './link-format.js';
import './af-file-upload.js';

import Compress from 'compress.js';
const compress = new Compress();

Template.afFileUpload.onCreated(function () {
  if (!this.data) this.data = { atts: {} };  
  this.formId  = this.data.atts.id;
  this.collection = this.data.atts.collection;
  this.inputFieldName = this.data.name;
  this.dbValue = this.data.value || null;
  return;
});

Template.afFileUpload.viewmodel({
  value: null,  // viewmodel Value!
  currentUpload: null,
  currentProgress: 0,
  onCreated(template) {
    this.value(template.data.value || null);
    return;
  },
  textOrHidden() {
    const vmValue = this.value();
    return vmValue ? "hidden" : "text";
//    return isHostedByUs(vmValue) ? "hidden" : "text";
  },
  valueHasChanged() {
    return this.value() !== this.templateInstance.dbValue;
  },
});

Template.afFileUpload.events({
  'click [data-reset-file]'(e, template) {
    e.preventDefault();
    template.viewmodel.value(null);
    return false;
  },
  'click [data-remove-file]'(e, template) {
    e.preventDefault();
    const vmValue = template.viewmodel.value();
    template.viewmodel.value(null);
    const upload = link2doc(vmValue, template.collection);
    if (upload) upload.remove();
  },
  'click button[name=upload]'(e, template) {
    e.preventDefault();
    let ctx;
    try {
      ctx = AutoForm.getValidationContext(template.formId);
    } catch (exception) {
      ctx = AutoForm.getValidationContext();  // Fix: "TypeError: Cannot read property '_resolvedSchema' of undefined"
    }
    function uploadFile(file) {
      console.log("Uploading file", file);
      const doc = {
        name: file.name,
        size: file.size,
        type: file.type,
        communityId: Session.get('activeCommunityId'),
        userId: Meteor.userId(),
      };

      // Create a new Uploader for this file
      const uploader = new UploadFS.Uploader({
        store: template.collection,
        data: file, // The File/Blob object containing the data
        file: doc,  // The document to save in the collection

        // settings copied from example file
        adaptive: true,
        capacity: 0.8, // 80%
        chunkSize: 8 * 1024, // 8k
        maxChunkSize: 128 * 1024, // 128k
        maxTries: 5,

        onError(err, file) {
          console.error('Error during uploading ' + file.name);
          console.error(err);
          ctx.resetValidation();
          ctx.addInvalidKeys([{ name: template.inputFieldName, type: 'uploadError', value: err.reason }]);
          template.viewmodel.value('');
          template.viewmodel.currentUpload(null);
        },
        onAbort(file) {
          console.log(file.name + ' upload has been aborted');
          template.viewmodel.currentUpload(null);
        },
        onComplete(file) {
          console.log(file.name + ' has been uploaded');
          template.viewmodel.value(file.path);
          template.viewmodel.currentUpload(null);
          template.viewmodel.currentProgress(0);
        },
        onCreate(file) {
          console.log(file.name + ' has been created with ID ' + file._id);
        },
        onProgress(file, progress) {
          //console.log(file.name + ' ' + (progress*100) + '% uploaded');
          template.viewmodel.currentProgress(Math.round(progress*100));
        },
        onStart(file) {
          //console.log(file.name + ' started');
          ctx.resetValidation();
          template.viewmodel.currentProgress(0);
          template.viewmodel.currentUpload(this);
        },
        onStop(file) {
          console.log(file.name + ' stopped');
        },
      });    
      uploader.start(); // Starts the upload
    }

    UploadFS.selectFile(function (file) {
      const MAX_IMAGE_MB = 0.5;
      if (file.type.startsWith('image') && file.size > MAX_IMAGE_MB * 1024 * 1024) {
        console.log("Compressing file", file);
        compress.compress([file], {
          size: MAX_IMAGE_MB, // compress needs it in MB (while ufs size is in bytes)
          maxWidth: 1024,
          maxHeight: 1024,
        }).then((results) => {
          //console.log("compressed image:", results[0]);
          const img1 = results[0];
          const base64str = img1.data;
          const imgExt = img1.ext;
          const compressedFile = Compress.convertBase64ToFile(base64str, imgExt);
          compressedFile.name = file.name;
          uploadFile(compressedFile);
        });
      } else { uploadFile(file); }
    });
  },
});
