import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/api/attachments/attachments.js';
import '/imports/api//attachments/attachments-store.js';

export const allowedOptions = function allowedOptions() {
  // Here the autoform-i18n options are being used, which are the translated values of the allowedOptions()
  return {
    firstOption: () => __('(Select one)'),
  };
};

export const autoformOptions = function autoformOptions(values, i18Path = '') {
  return {
    options() {
      const valuesArray = (values instanceof Function) ? values() : values;
      return valuesArray.map(function option(t) { return { label: __(i18Path + t), value: t }; });
    },
    firstOption: () => __('(Select one)'),
  };
};

export const noUpdate = {
  disabled() {
    const afType = ModalStack.getVar('autoformType');
    return afType === 'update' || afType === 'method-update';
  },
};

export const imageUpload = () => ({
  afFieldInput: {
    type: 'fileUpload',
    collection: 'attachments',
    fileType: 'image',
  },
});

export const documentUpload = () => ({
  afFieldInput: {
    type: 'fileUpload',
    collection: 'shareddocs',
    fileType: 'document',
//    multi: true,
  },
});

export const attachmentUpload = () => ({
  afFieldInput: {
    type: 'fileUpload',
    collection: 'attachments',
    fileType: 'attachment',
  },
});
