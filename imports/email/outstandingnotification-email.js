import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Communities } from '../api/communities/communities';
import { Partners } from '../api/partners/partners';

export const OutstandingNotification_Email = {
  path: 'email/outstandingnotification-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
  },

  route: {
    path: '/outstandingnotification-email/:pid/:cid',
    data: params => ({
      communityId: Communities.findOne(params.cid),
      outstandings: Transactions.find({ partnerId: params.pid, category: 'bill', outstanding: { $gt: 0 } }).fetch(),
      partner: Partners.findOne(params.pid),
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
    }),
  },
};
