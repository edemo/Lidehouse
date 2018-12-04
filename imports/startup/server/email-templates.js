import { Meteor } from 'meteor/meteor';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';

export const EmailTemplates = {
  notifications: {
    path: 'email/notifications.html',    // Relative to the 'private' dir.
    // scss: 'email/style.css',       // Mail specific SCSS.

    helpers: {
      user() {
        return Meteor.users.findOne(this.userId);
      },
      community() {
        return Communities.findOne(this.communityId);
      },
      text() {
        let thingsHappened = false;
        let body = 'Dear user! <br>' +
          'Things happened since you last logged in: <br>';
        Topics.find({ communityId: this.communityId, closed: false }).forEach((topic) => {
          const topicNotification = topic.notifications(this.userId);
          if (topicNotification) {
            thingsHappened = true;
            body += topicNotification + '<br>';
            const user = Meteor.users.findOne(this.userId);
            user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
          }
        });
        if (!thingsHappened) return '';
        return body;
      },
    },

    route: {
      path: '/notifications/:uid/:cid',
      data: params => ({
        userId: params.uid,
        communityId: params.cid,
      }),
    },
  },
};

// -------------- Sample -------------------
/*
export const SampleEmailTemplates = {
  sample: {
    path: 'sample-email/template.html',    // Relative to the 'private' dir.
    scss: 'sample-email/style.scss',       // Mail specific SCSS.

    helpers: {
      capitalizedName() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
      },
    },

    route: {
      path: '/sample/:name',
      data: params => ({
        name: params.name,
        names: ['Johan', 'John', 'Paul', 'Ringo'],
      }),
    },
  },
};
*/
