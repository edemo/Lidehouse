import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import '/imports/api/transactions/batches/methods.js';
import { parcelBillingColumns } from '/imports/api/transactions/batches/tables.js';
import { allParcelBillingActions } from '/imports/api/transactions/batches/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import './parcel-billings.html';

Template.Parcel_billings.viewmodel({
  communityId() {
    return Session.get('activeCommunityId');
  },
  tableDataFn() {
    return () => ParcelBillings.find().fetch();
  },
  optionsFn() {
    return () => Object.create({
      columns: parcelBillingColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[5, 10, 50, -1], [5, 10, 50, __('all')]],
      pageLength: 10,
    });
  },
});

Template.Parcel_billings.events(
  actionHandlers(allParcelBillingActions())
);
