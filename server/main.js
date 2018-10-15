import '/imports/startup/both';
import '/imports/startup/server';

Meteor.startup(function () {
  console.log('Running with Meteor.settings:', Meteor.settings);
});
