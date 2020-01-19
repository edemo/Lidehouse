import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Partners } from '../api/partners/partners';

export const Bill_Email = {
  path: 'email/bill-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
  },

  route: {
    path: '/bill-email/:bid/:pid/:cid',
    data: params => ({
      type: 'Bill',
      bill: Transactions.findOne(params.bid),
      partner: Partners.findOne(params.pid),
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
      communityId: params.cid,
    }),
  },
};
