
import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { EmailSender, templateToHTML } from './email-sender.js';

const stylesheet = fs.readFileSync('assets/app/email/style.css', 'utf8');

function renderTopicToHtml(community, user) {   // TODO: take notiLevel into account
  const seenType = Meteor.users.SEEN_BY_NOTI;
  let thingsHappened = false;
  const liveTopics = Topics.find({ communityId: community._id, closed: false }).fetch();
  const categoryValues = ['forum', 'vote', 'news', 'ticket', 'feedback', 'room'];
  let bodyOfEmail = 'Community: ' + community.name;
  const helpers = {
    displayTime(time) {
      return moment(time).format('L LT');;
    },
    _(text) {
      return TAPi18n.__(text, {}, 'hu');
    },
    author() {
      const userFile = Meteor.users.findOne(this.userId);
      const email = userFile.emails[0].address;
      const emailName = email.split('@')[0];
      if (userFile.profile && userFile.profile.lastName && userFile.profile.firstName) {
        return userFile.profile.lastName + ' ' + userFile.profile.firstName;
      }
      return emailName;
    },
    generateURL(topicId) {
      return 'https://honline.hu/topic/' + topicId; // TODO: different for news and room!
    },
    oldTopic(data) {
      if (data) { 
        return 'oldTopic';
      } else {
        return '';
      }
    }
  };

  categoryValues.forEach((category) => {
    const topicsByCategory = liveTopics.filter(topic => topic.category === category);
    const topicItems = [];
    let commentSection = '';
    topicsByCategory.forEach((topic) => {
      let commentItems = [];
      if (!topic.isUnseenBy(user._id, seenType) && category !== 'room') {
        
       // topicItems.push(topic);
        //user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI); //TODO: in case of room as well?
      };
      if (topic.unseenCommentsBy(user._id, seenType) > 0) {
        if (topic.participantIds && !_.contains(topic.participantIds, user._id)) return;
        const lastSeenInfo = user.lastSeens[seenType][topic._id];
        const timeStamp = lastSeenInfo ? lastSeenInfo.timestamp : user.createdAt;
        commentItems = Comments.find({ topicId: topic._id, createdAt: { $gt: timeStamp } }).fetch();
        //if (commentItems.length > 0) {
         
          // TODO: change commentCounter in user.lastSeens;
        //}
        //return commentItems;
      }; 
      commentSection += templateToHTML('template4comments', { commentItems, category, topic }, helpers );
    });
    if (topicItems.length > 0 || commentSection.length > 0 ) {
      bodyOfEmail += templateToHTML('template4topics', { commentSection, category }, helpers);
      thingsHappened = true;
    }
  })

  if (!thingsHappened) return;
   //user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI); This should be here when everything is fine.
  return bodyOfEmail;
};


function sendNotifications(user) {
  let thingsHappened = false;
  let body = '';

  user.communities().forEach(community => {

    /*Topics.find({ communityId: community._id, closed: false }).forEach(topic => {
      const topicNotification = topic.notifications(user._id);
      if (topicNotification) {*/
        thingsHappened = true;
        body += renderTopicToHtml(community, user);//topicNotification + '<br>';
        //user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
      /*   }
    });*/
  });
  if (!thingsHappened) return;

  const title = 'Updates from honline';
  const footer = `You are getting these notifications, because you have email notifications sent ${user.settings.notiFrequency}.<br>` +
  'You can change your email notification settings <a href="https://honline.hu/profile"> on this link </a> <br>' +
  'Greetings by the honline team';
  EmailSender.send('email-template-noti', { to: user.getPrimaryEmail(), subject: title }, { stylesheet, title, body, footer });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => {
    sendNotifications(user);
  });
}
