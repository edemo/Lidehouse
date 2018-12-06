
import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';

function sendNotifications(user) {
  user.communities().forEach((community) => {
    // let thingsHappened = false;
    Mailer.send({
      to: user.getPrimaryEmail(),
      subject: 'Updates from honline',
      template: 'Notification_Email',
      data: {
        userId: user._id,
        communityId: community._id,
      },
    });
  });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}
