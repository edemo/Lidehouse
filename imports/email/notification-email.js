import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';

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
    curb(text, chars) {
      if (text.length < chars) return text;
      return text.substr(0, chars) + `... [${TAPi18n.__('see full text with View button', {}, Meteor.users.findOne(this.userId).settings.language)}]`;
    },
    linkPath(topic) {
      if (topic.category === 'room') {
        return FlowRouterHelpers.pathFor('Room.show', { _rid: topic._id });
      }
      return FlowRouterHelpers.pathFor('Topic.show', { _tid: topic._id });
    },
    topics() {
      const topics = Topics.topicsNeedingAttention(this.userId, this.communityId, Meteor.users.SEEN_BY.NOTI);
      return topics.sort((t1, t2) => Topics.categoryValues.indexOf(t2.category) - Topics.categoryValues.indexOf(t1.category));
    },
    isUnseen(topic) {
      return topic.isUnseenBy(this.userId, Meteor.users.SEEN_BY.NOTI);
    },
    hasUnseenComments(topic) {
      return topic.unseenCommentsBy(this.userId, Meteor.users.SEEN_BY.NOTI) > 0;
    },
    unseenCommentList(topic) {
      const comments = topic.unseenCommentListBy(this.userId, Meteor.users.SEEN_BY.NOTI);
      return comments;
    },
    categoryImgUrlFor(category) {
      const file = {
        // feedback: '',
        forum: 'font-awesome_4-7-0_commenting_100_0_2d4050_none.png',
        ticket: 'font-awesome_4-7-0_wrench_100_0_2d4050_none.png',
        room: 'font-awesome_4-7-0_envelope_100_0_2d4050_none.png',
        vote: 'font-awesome_4-7-0_gavel_100_0_2d4050_none.png',
        news: 'font-awesome_4-7-0_exclamation-circle_100_0_2d4050_none.png',
      };
      // return 'https://honline.hu/images/email/' + file[category]; // use this for testing, because localhost may not be accessible by mail clients
      return FlowRouterHelpers.urlFor('/images/email/' + file[category]);
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
