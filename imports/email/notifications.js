
import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';

function sendNotifications(user) {
  user.communities().forEach((community) => {
    const topics = Topics.topicsNeedingAttention(user._id, community._id, Meteor.users.SEEN_BY.NOTI);
    if (topics.length > 0) {
      Mailer.send({
        to: user.getPrimaryEmail(),
        subject: 'Updates from honline',
        template: 'Notification_Email',
        data: {
          userId: user._id,
          communityId: community._id,
        },
      });
      topics.forEach(topic => user.hasNowSeen(topic, Meteor.users.SEEN_BY.NOTI));
    }
  });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}
