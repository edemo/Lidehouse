import '/imports/startup/server';
import '/imports/startup/both';

Meteor.startup(function () {
  console.log('Running with Meteor.settings:', Meteor.settings);
});
