import '/imports/startup/both';
import '/imports/startup/server';
import { Meteor } from 'meteor/meteor';
import { Log } from '/imports/utils/log.js';

Meteor.startup(function () {
  Log.info('Running with Meteor.settings:', Meteor.settings);
});
