
import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';

function sendEmail(emailAddress, emailTitle, emailBody) {
  console.log('Sending out notification email to ' + emailAddress);
  console.log('Title: ' + emailTitle);
  console.log('Body: ' + emailBody);
  // TODO: Lets send him this wonderful notification email!
}

function sendNotifications(user) {
  let thingsHappened = false;
  let emailBody = 'Dear user! \n' +
  'Things happened since you last logged in:\n';

  user.communities().forEach(community => {
    Topics.find({ communityId: community._id, closed: false }).forEach(topic => {
      const topicNotification = topic.notifications(user._id);
      if (topicNotification) {
        thingsHappened = true;
        emailBody += topicNotification + '\n';
        user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
      }
    });
  });
  if (!thingsHappened) return;

  const emailAddress = user.getPrimaryEmail();
  const emailTitle = 'Updates from honline';
  emailBody += `You are getting these notifications, because you have email notifications sent ${user.settings.notiFrequency}, \n` +
  'You can change your email notification settings on this link https://honline.hu/profile \n' +
  'Greetings by the honline team';
  sendEmail(emailAddress, emailTitle, emailBody);
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
