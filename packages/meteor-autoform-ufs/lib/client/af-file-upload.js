import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { UploadFS } from 'meteor/jalik:ufs';

import { isHostedByUs, link2doc } from './link-format.js';
import './display-image.html';
import './display-document.html';
import './display-file.html';
import './af-file-upload.html';

import Compress from 'compress.js';
const compress = new Compress();

export function isImage(file) {
  const parts = file.split('.');
  const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const fileType = UploadFS.getMimeType(extension);
  if (fileType?.split('/')[0] === 'image') return true;
  return (/\.(gif|jpe?g|tiff?|png|webp|bmp)\?/i).test(file);
}

function uploadFile(file, context, inst) {
  console.log("Uploading file", file);
  const doc = {
    name: file.name,
    size: file.size,
    type: file.type,
    communityId: Session.get('communityId'),
    userId: Meteor.userId(),
  };
  const inputField = inst.inputFieldName.split('.')[0];
  const store = (inputField === 'photo' || inputField === 'avatar') ? 'photo' : inst.collection;
  
  // Create a new Uploader for this file
  const uploader = new UploadFS.Uploader({
    store,
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
      context.resetValidation();
      context.addInvalidKeys([{ name: inst.inputFieldName, type: 'uploadError', value: err.reason }]);
      inst.viewmodel.vmValue('');
      inst.viewmodel.currentUpload(null);
      alert(err.message);
    },
    onAbort(file) {
      console.log(file.name + ' upload has been aborted');
      inst.viewmodel.currentUpload(null);
    },
    onComplete(file) {
      console.log(file.name + ' has been uploaded');
      inst.viewmodel.vmValue(file.path);
      inst.viewmodel.currentUpload(null);
      inst.viewmodel.currentProgress(0);
    },
    onCreate(file) {
      console.log(file.name + ' has been created with ID ' + file._id);
    },
    onProgress(file, progress) {
      //console.log(file.name + ' ' + (progress*100) + '% uploaded');
      inst.viewmodel.currentProgress(Math.round(progress*100));
    },
    onStart(file) {
      //console.log(file.name + ' started');
      context.resetValidation();
      inst.viewmodel.currentProgress(0);
      inst.viewmodel.currentUpload(this);
    },
    onStop(file) {
      console.log(file.name + ' stopped');
    },
  });    
  uploader.start(); // Starts the upload
}

function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
      
  while(n--) { u8arr[n] = bstr.charCodeAt(n)};
  return new File([u8arr], filename, {type:mime});
}

Template.afFileUpload.onCreated(function () {
  if (!this.data) this.data = { atts: {} };  
  this.formId  = this.data.atts.id;
  this.collection = this.data.atts.collection;
  this.inputFieldName = this.data.name;
  this.dbValue = this.data.value || null;
  return;
});

Template.afFileUpload.viewmodel({
  vmValue: null,  // viewmodel Value!
  currentUpload: null,
  currentProgress: 0,
  onCreated(instance) {
    this.vmValue(instance.data.value || null);
    return;
  },
  textOrHidden() {
    const vmValue = this.vmValue();
    return vmValue ? "hidden" : "text";
//    return isHostedByUs(vmValue) ? "hidden" : "text";
  },
  valueHasChanged() {
    return this.vmValue() !== this.templateInstance.dbValue;
  },
  template() {
    let fileType = this.templateInstance.data.atts.fileType;
    if (fileType == 'attachment') {
      if (isImage(this.vmValue())) fileType = 'image';
      else fileType = 'document';
    };
    const template = `Display_${fileType}`;
    return template;
  },
  context() {
    return { value: this.vmValue() };
  },
});

Template.afFileUpload.events({
  'click .create-photo'(event, instance) {
    const cameraOptions = {
      width: 800,
      height: 600,
      quality: 100
    };

    let ctx;
    try {
      ctx = AutoForm.getValidationContext(instance.formId);
    } catch (exception) {
      ctx = AutoForm.getValidationContext();  // Fix: "TypeError: Cannot read property '_resolvedSchema' of undefined"
    }

    MeteorCamera.getPicture(cameraOptions, function (error, data) {
      if(!error){
        const file = dataURLtoFile(data, 'image')
        uploadFile(file, ctx, instance);
      }
    })
  },
  'click [data-reset-file]'(event, instance) {
    event.preventDefault();
    instance.viewmodel.vmValue(null);
    return false;
  },
  'click [data-remove-file]'(event, instance) {
    event.preventDefault();
    const vmValue = instance.viewmodel.vmValue();
    instance.viewmodel.vmValue(null);
    const upload = link2doc(vmValue, instance.collection);
    if (upload) upload.remove();
  },
  'blur input'(event, instance) {
    const value = event.target.value;
    instance.viewmodel.vmValue(value);
  },
  'click button[name=upload]'(event, instance) {
    event.preventDefault();
    let ctx;
    try {
      ctx = AutoForm.getValidationContext(instance.formId);
    } catch (exception) {
      ctx = AutoForm.getValidationContext();  // Fix: "TypeError: Cannot read property '_resolvedSchema' of undefined"
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
          uploadFile(compressedFile, ctx, instance);
        });
      } else { uploadFile(file, ctx, instance); }
    });
  },
});
