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

function displayLocalizer(localizer, community) {
  const loc = Localizer.get(community._id);
  if (!localizer || !loc) return '';
  return loc.display(localizer).substring(1);
}

export const Notifications_Email = {
  path: 'email/notifications-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
    userUrlFor(user) {
      return FlowRouterHelpers.urlFor('User show', { _id: user._id });
    },
    voteHasBeenClosed(topic) {
      if (topic.status === 'closed' && topic.category === 'vote') {
        const unseenComments = topic.unseenCommentListBy(this.user._id, Meteor.users.SEEN_BY.NOTI);
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
      if (key === 'localizer') return displayLocalizer(value, this.community);
      if (key === 'partnerId') return Partners.findOne(value) ? Partners.findOne(value).name : '';
      if (key === 'contractId') return Contracts.findOne(value) ? Contracts.findOne(value).title : '';
      if (key === 'chargeType') return TAPi18n.__('schemaTickets.ticket.chargeType.' + value, {}, this.user.settings.language);
      if (_.isDate(value)) return moment(value).format('L');
      if (_.isString(value)) return TAPi18n.__(value, {}, this.user.settings.language);
      return value;
    },
    frequencyKey() {
      return 'schemaUsers.settings.notiFrequency.' + this.user.settings.notiFrequency;
    },
  },

  route: {
    path: '/notifications-email/:uid/:cid',
    data: params => ({
      type: 'Notifications',
      user: Meteor.users.findOne(params.uid),
      community: Communities.findOne(params.cid),
      topicsToDisplay: Topics.topicsWithUnseenEvents(params.uid, params.cid, Meteor.users.SEEN_BY.NOTI).filter(t => t.hasThingsToDisplay()),
      alert: 'good',
      notificationInstructions: TAPi18n.__('NotificationInstructions', {}, Meteor.users.findOne(params.uid).settings.language),
      footer: TAPi18n.__('email.NotificationFooter', { link: FlowRouterHelpers.urlFor('User data page'), adminEmail: Communities.findOne(params.cid).admin().profile.publicEmail, frequency: 'schemaUsers.settings.notiFrequency.' + Meteor.users.findOne(params.uid).settings.notiFrequency }, Meteor.users.findOne(params.uid).settings.language),
    }),
  },
};
