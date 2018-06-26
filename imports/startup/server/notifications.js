
import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import { EmailSender } from './email-sender.js';

function sendNotifications(user) {
  let thingsHappened = false;
  let body = 'Dear user! \n' +
  'Things happened since you last logged in:\n';

  user.communities().forEach(community => {
    Topics.find({ communityId: community._id, closed: false }).forEach(topic => {
      const topicNotification = topic.notifications(user._id);
      if (topicNotification) {
        thingsHappened = true;
        body += topicNotification + '\n';
        user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
      }
    });
  });
  if (!thingsHappened) return;

  const title = 'Updates from honline';
  const footer = `You are getting these notifications, because you have email notifications sent ${user.settings.notiFrequency}, \n` +
  'You can change your email notification settings <a href="https://honline.hu/profile"> on this link </a> \n' +
  'Greetings by the honline team';
  EmailSender.send('email-template-noti', { to: user.getPrimaryEmail(), subject: title }, { title, body, footer });
}

function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => {
    sendNotifications(user);
  });
}

let counter = 0;
const checkPeriod = moment.duration(6, 'seconds');

function checkNotifications() {
  counter++;
  // console.log(counter);
  if (counter % (4 * 7) === 0) processNotifications('weekly');
  if (counter % 4 === 0) processNotifications('daily');
  processNotifications('frequent');
}

Meteor.setInterval(checkNotifications, checkPeriod);
