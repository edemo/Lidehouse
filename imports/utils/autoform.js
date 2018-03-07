import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';

export const autoformOptions = function autoformOptions(values, i18Path = '') {
  return {
    options() {
      return values.map(function option(t) { return { label: __(i18Path + t), value: t }; });
    },
  };
};

export const chooseUser = {
  options() {
    return Meteor.users.find({}).map(function option(u) {
      return { label: u.displayName(), value: u._id };
    });
  },
};
