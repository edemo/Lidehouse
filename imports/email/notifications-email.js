import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import '/imports/api/users/users.js';

function displayLocalizer(localizer, communityId) {
  const loc = Localizer.get(communityId);
  if (!localizer || !loc) return '';
  return loc.display(localizer).substring(1);
}

export const Notifications_Email = {
  path: 'email/notifications-email.html',    // Relative to the 'private' dir.
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
    userUrlFor(user) {
      return FlowRouterHelpers.urlFor('User show', { _id: user._id });
    },
    topicUrlFor(topic) {
      if (topic.category === 'room') {
        return FlowRouterHelpers.urlFor('Room show', { _rid: topic._id });
      }
      return FlowRouterHelpers.urlFor('Topic show', { _tid: topic._id });
    },
    voteHasBeenClosed(topic) {
      if (topic.status === 'closed' && topic.category === 'vote') {
        const unseenComments = topic.unseenCommentListBy(this.userId, Meteor.users.SEEN_BY.NOTI);
        const closingEvent = unseenComments.find(comment => comment.type === 'statusChangeTo' && comment.status === 'closed');
        if (closingEvent) return true;
        return false;
      }
      return false;
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
    oldTopic(t) {
      return t.isUnseen ? '' : 'oldTopic';
    },
    displayStatusChangeDataUpdate(key, value) {
      const user = Meteor.users.findOne(this.userId);
      if (key === 'localizer') return displayLocalizer(value, this.communityId);
      if (key === 'partnerId') return Partners.findOne(value) ? Partners.findOne(value).name : '';
      if (key === 'contractId') return Contracts.findOne(value) ? Contracts.findOne(value).title : '';
      if (key === 'chargeType') return TAPi18n.__('schemaTickets.ticket.chargeType.' + value, {}, user.settings.language);
      if (_.isDate(value)) return moment(value).format('L');
      if (_.isString(value)) return TAPi18n.__(value, {}, user.settings.language);
      return value;
    },
  },

  route: {
    path: '/notifications-email/:uid/:cid',
    data: params => ({
      type: 'Notifications',
      userId: params.uid,
      communityId: params.cid,
      topicsToDisplay: Topics.topicsWithUnseenEvents(params.uid, params.cid, Meteor.users.SEEN_BY.NOTI).filter(t => t.hasThingsToDisplay()),
      notificationInstructions: TAPi18n.__('defaultNotificationInstructions', {}, Meteor.users.findOne(params.uid).settings.language),
      footer: TAPi18n.__('email.NotificationFooter', { link: FlowRouterHelpers.urlFor('User data page'), adminEmail: Communities.findOne(params.cid).admin().profile.publicEmail, frequency: 'schemaUsers.settings.notiFrequency.' + Meteor.users.findOne(params.uid).settings.notiFrequency }, Meteor.users.findOne(params.uid).settings.language),
    }),
  },
};
