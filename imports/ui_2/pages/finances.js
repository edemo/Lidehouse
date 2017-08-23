import { Template } from 'meteor/templating';
import { Payments } from '/imports/api/payments/payments.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { paymentColumns } from '/imports/api/payments/tables.js';

import './finances.html';

Template.Finances.onCreated(function financesOnCreated() {
});

Template.Finances.helpers({
  reactiveTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Payments.find({ communityId }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: paymentColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Finances.events({
  'click .js-new-payment'(event) {
  },
});
