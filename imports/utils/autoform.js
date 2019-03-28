import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { Attachments } from '/imports/api/attachments/attachments.js';
import { AttachmentsStore } from '/imports/api//attachments/attachments-store.js';

export const autoformOptions = function autoformOptions(values, i18Path = '') {
  return {
    options() {
      const valuesArray = (values instanceof Function) ? values() : values;
      return valuesArray.map(function option(t) { return { label: __(i18Path + t), value: t }; });
    },
    firstOption: () => __('(Select one)'),
  };
};

export const chooseUser = {
  options() {
    const users = Meteor.users.find({});
    const options = users.map(function option(u) {
      return { label: u.displayName(), value: u._id };
    });
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
  firstOption: () => __('(Select one)'),
};

export const noUpdate = {
  disabled() {
    if (Meteor.isClient) {
      import { Session } from 'meteor/session';
      const afType = Session.get('autoformType');
      return afType === 'update' || afType === 'method-update';
    }
    return false;
  },
};

export const fileUpload = {
  afFieldInput: {
    type: 'fileUpload',
    collection: 'attachments',
  },
};

