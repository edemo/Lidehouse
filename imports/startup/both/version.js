import { Meteor, check } from 'meteor/meteor';

export const version = new Date();

Meteor.methods({
  'version.get'(params) {
    check(params, {});
    return version;
  },
});
