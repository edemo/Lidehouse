import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';

import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/users/users.js';

function displayCurrency(value) {
  return numeral(value).format('0,0$');
}

function displayLocalizer(localizer, community) {
  return localizer.substring(1);
}

function displayTxIdentifiers(identifiers, community) {
  if (!identifiers) return '';
  var result = '';
  identifiers.split(',').forEach((identifier, index) => {
    const tx = Transactions.findOne({ communityId: community._id, serialId: identifier.trim() });
    if (!tx) return;
    if (index > 0) result += '\n+ ';
    result += `${displayCurrency(tx?.amount)} (${identifier})`;
  });
  return result;
}

export const Notifications_Email = {
  path: 'email/notifications-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  layoutData: {
    type: 'Notifications',
    header: 'NotificationsHeader',
    footer: 'NotificationsFooter',
    alert: 'good',
  },

  helpers: {
    userUrlFor(user) {
      return FlowRouterHelpers.urlFor('User show', { _id: user._id });
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
      numeral.language(this.community.settings.language);
      if (key.includes('Cost')) return displayCurrency(value);
      if (key === 'localizer') return displayLocalizer(value, this.community);
      if (key === 'partnerId') return Partners.findOne(value) ? Partners.findOne(value).getName() : '';
      if (key === 'contractId') return Contracts.findOne(value) ? Contracts.findOne(value).title : '';
      if (key === 'chargeType') return TAPi18n.__('schemaTickets.ticket.chargeType.options.' + value, {}, this.user.settings.language);
      if (key === 'txIdentifiers') return displayTxIdentifiers(value, this.community);
      if (_.isDate(value)) return moment(value).format('L');
      if (_.isString(value)) return TAPi18n.__(value, {}, this.user.settings.language);
      return value;
    },
  },

  route: {
    path: '/notifications-email/:uid/:cid',
    data: params => ({
      user: Meteor.users.findOne(params.uid),
      community: Communities.findOne(params.cid),
      topicsToDisplay: Topics.topicsWithUnseenEvents(params.uid, params.cid, Meteor.users.SEEN_BY.NOTI).filter(t => t.hasThingsToDisplay()),
      ...Notifications_Email.layoutData,
    }),
  },
};

export const Immediate_Notifications_Email = _.extend({}, Notifications_Email, {
  layoutData: {
    type: 'Notifications',
    header: 'NotificationsHeader',
    footer: 'ImmediateNotificationsFooter',
    alert: 'warning',
  },
});
