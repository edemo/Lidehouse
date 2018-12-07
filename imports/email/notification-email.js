import { Meteor } from 'meteor/meteor';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';

export const Notification_Email = {
  path: 'email/notification-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
    user() {
      return Meteor.users.findOne(this.userId);
    },
    community() {
      return Communities.findOne(this.communityId);
    },
    topics() {
      return Topics.find({ communityId: this.communityId, closed: false }).fetch()
        .filter(t => t.isUnseenBy(this.userId) || t.unseenCommentsBy(this.userId) > 0)
        .sort((t1, t2) => Topics.categoryValues.indexOf(t2.category) - Topics.categoryValues.indexOf(t1.category));
    },
    isUnseen(topic) {
      return topic.isUnseenBy(this.userId);
    },
    hasUnseenComments(topic) {
      return topic.unseenCommentsBy(this.userId) > 0;
    },
    unseenCommentList(topic) {
      const comments = topic.unseenCommentListBy(this.userId);
      const user = Meteor.users.findOne(this.userId);
      user.hasNowSeen(topic, Meteor.users.SEEN_BY_NOTI);
      return comments;
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
    path: '/notification-email/:uid/:cid',
    data: params => ({
      userId: params.uid,
      communityId: params.cid,
    }),
  },
};
