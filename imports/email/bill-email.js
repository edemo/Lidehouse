import { Meteor } from 'meteor/meteor';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Parcels } from '../api/parcels/parcels';

export const Bill_Email = {
  path: 'email/bill-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  layoutData: {
    type: 'New bill',
    alert: 'good',
    footer: 'BillFooter',
  },

  helpers: {
    parcelRef(parcelId) {
      return Parcels.findOne(parcelId).ref;
    },
  },

  route: {
    path: '/bill-email/:bid',
    data: (params) => {
      const bill = Transactions.findOne(params.bid);
      const partner = bill.partner();
      return {
        user: partner.user(),
        community: bill.community(),
        bill,
        ...Bill_Email.layoutData,
      };
    },
  },
};
