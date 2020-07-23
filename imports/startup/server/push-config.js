import { Meteor } from 'meteor/meteor';
import { Push } from 'meteor/raix:push';

Meteor.startup(function () {
  console.log('Running with Meteor.settings:', Meteor.settings);

  if (Meteor.settings.android && Meteor.settings.public.android) {
    Push.Configure({
      gcm: {
        apiKey: Meteor.settings.android.serverKey,
        projectNumber: Meteor.settings.public.android.senderID,
      },
    });

    Push.allow({
      send: (userId, notification) => true,
    });
  }
});
