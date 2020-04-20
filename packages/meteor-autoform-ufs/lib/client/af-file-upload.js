import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { isHostedByUs, link2doc } from './link-format.js';
import './display-image.html';
import './display-document.html';
import './display-file.html';
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
  onCreated(instance) {
    this.value(instance.data.value || null);
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
  template() {
    const template = `Display_${this.templateInstance.data.atts.fileType}`;
    return template;
  },
  context() {
    return { value: this.value() };
  },
});

Template.afFileUpload.events({
  'click [data-reset-file]'(event, instance) {
    event.preventDefault();
    instance.viewmodel.value(null);
    return false;
  },
  'click [data-remove-file]'(event, instance) {
    event.preventDefault();
    const vmValue = instance.viewmodel.value();
    instance.viewmodel.value(null);
    const upload = link2doc(vmValue, instance.collection);
    if (upload) upload.remove();
  },
  'blur input'(event, instance) {
    const value = event.target.value;
    instance.viewmodel.value(value);
  },
  'click button[name=upload]'(event, instance) {
    event.preventDefault();
    let ctx;
    try {
      ctx = AutoForm.getValidationContext(instance.formId);
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
        store: instance.collection,
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
          ctx.addInvalidKeys([{ name: instance.inputFieldName, type: 'uploadError', value: err.reason }]);
          instance.viewmodel.value('');
          instance.viewmodel.currentUpload(null);
        },
        onAbort(file) {
          console.log(file.name + ' upload has been aborted');
          instance.viewmodel.currentUpload(null);
        },
        onComplete(file) {
          console.log(file.name + ' has been uploaded');
          instance.viewmodel.value(file.path);
          instance.viewmodel.currentUpload(null);
          instance.viewmodel.currentProgress(0);
        },
        onCreate(file) {
          console.log(file.name + ' has been created with ID ' + file._id);
        },
        onProgress(file, progress) {
          //console.log(file.name + ' ' + (progress*100) + '% uploaded');
          instance.viewmodel.currentProgress(Math.round(progress*100));
        },
        onStart(file) {
          //console.log(file.name + ' started');
          ctx.resetValidation();
          instance.viewmodel.currentProgress(0);
          instance.viewmodel.currentUpload(this);
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
