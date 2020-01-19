import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';

export const Bill_Email = {
  path: 'email/bill-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
  },

  route: {
    path: '/bill-email/:bid',
    data: params => {
      const bill = Transactions.findOne(params.bid);
      return {
        type: 'Bill',
        user: bill.partner().user(),
        community: bill.community(),
        bill,
        link: FlowRouterHelpers.urlFor('Parcels finances'),
        alert: 'good',
      };
    },
  },
};
