import { Meteor } from 'meteor/meteor';
import { Communities } from '/imports/api/communities/communities.js';

export const Notification_Layout = {
  name: 'Notification_Layout',
  path: 'email/notification-layout.html',   // Relative to 'private' dir.
  css: 'email/style.css',
  helpers: {
    title() {
      return `Updates from ${Communities.findOne(this.communityId).name}`;
    },
    footer() {
      return `You are getting these notifications, because you have email notifications sent ${Meteor.users.findOne(this.userId).settings.notiFrequency}.<br>` +
        'You can change your email notification settings <a href="https://honline.hu/profile"> on this link </a> <br>' +
        'Greetings by the honline team';
    },
  },
};
