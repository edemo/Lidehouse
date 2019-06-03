import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';

export const Voteexpires_Email = {
  path: 'email/voteexpires-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
    curb(text, chars) {
      if (text.length < chars) return text;
      return text.substr(0, chars) + `... [${TAPi18n.__('see full text with View button', {}, Meteor.users.findOne(this.userId).settings.language)}]`;
    },
    topicUrlFor(vote) {
      return FlowRouterHelpers.urlFor('Topic.show', { _tid: vote._id });
    },
  },

  route: {
    path: '/voteexpires-email/:uid/:cid/:tid',
    data: params => ({
      userId: params.uid,
      communityId: params.cid,
      topics: Topics.find({ _id: params.tid }).fetch(),
      alertColor: 'alert-warning',
    }),
  },
};
