import { Meteor } from 'meteor/meteor';
import { Push, PushNotification } from 'meteor/raix:push';

Meteor.startup(function () {
  if (Meteor.settings.public.android) {
    Push.addListener('token', function(token) {
      console.log('Token: ' + JSON.stringify(token));
    });

    Push.addListener('notification', function(notification) {
      console.log('notification: ' + JSON.stringify(notification));
    });

    Push.addListener('startup', function(notification) {
      console.log('Routing Push: ' + JSON.stringify(notification));
    });

    Push.Configure({
      android: {
        senderID: Meteor.settings.public.android.senderID,
        alert: true,
        badge: true,
        sound: true,
        vibrate: true,
        clearNotifications: true,
        icon: 'resources/icons/icon-48x48.png',
      },
    });

    Push.debug = true;
    Push.id(); // Unified application id

    if (Meteor.isCordova) {
      PushNotification.createChannel(
        () => {
          console.log('createChannel');
        },
        () => {
          console.log('error');
        },
        {
          id: Meteor.userId(), // Use any Id you prefer, but the same Id for this channel must be sent from the server, 
          description: 'Android Channel', // And any description your prefer
          importance: 3,
          vibration: true,
        },
      );
    }
  }
});
