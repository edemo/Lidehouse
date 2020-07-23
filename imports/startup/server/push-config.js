import { Meteor } from 'meteor/meteor';
import { Push } from 'meteor/raix:push';

Meteor.startup(function () {
  console.log('Running with Meteor.settings:', Meteor.settings);

  Push.Configure({
    gcm: {
      apiKey: Meteor.settings.android.serverKey,
      projectNumber: Meteor.settings.android.senderID,
    },
  });

  Push.allow({
    send: (userId, notification) => true,
  });
});
