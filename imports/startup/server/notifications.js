
import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import fs from 'fs';
import { Topics } from '/imports/api/topics/topics.js';
import { EmailSender } from './email-sender.js';

const stylesheet = fs.readFileSync('assets/app/email/style.css', 'utf8');

function sendNotifications(user) {
  let thingsHappened = false;
  let body = 'Dear user! <br>' +
  'Things happened since you last logged in: <br>';

  user.communities().forEach(community => {
    Topics.find({ communityId: community._id, closed: false }).forEach(topic => {
      const topicNotification = topic.notifications(user._id);
      if (topicNotification) {
        thingsHappened = true;
        body += topicNotification + '<br>';
        user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
      }
    });
  });
  if (!thingsHappened) return;

  const title = 'Updates from honline';
  const footer = `You are getting these notifications, because you have email notifications sent ${user.settings.notiFrequency}.<br>` +
  'You can change your email notification settings <a href="https://honline.hu/profile"> on this link </a> <br>' +
  'Greetings by the honline team';
  EmailSender.send('email-template-noti', { to: user.getPrimaryEmail(), subject: title }, { stylesheet, title, body, footer });
}

function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => {
    sendNotifications(user);
  });
}

let counter = 0;
const checkPeriod = moment.duration(6, 'hours');

function checkNotifications() {
  counter++;
  // console.log(counter);
  if (counter % (4 * 7) === 0) processNotifications('weekly');
  if (counter % 4 === 0) processNotifications('daily');
  processNotifications('frequent');
}

Meteor.setInterval(checkNotifications, checkPeriod);
