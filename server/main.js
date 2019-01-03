import '/imports/startup/both';
import '/imports/startup/server';
import { Meteor } from 'meteor/meteor';

Meteor.startup(function () {
  console.log('Running with Meteor.settings:', Meteor.settings);
});
