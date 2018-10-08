import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';

import { Communities } from '/imports/api/communities/communities.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { remove as removePayment, billParcels } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { paymentColumns } from '/imports/api/payments/tables.js';
import { payaccountColumns } from '/imports/api/payaccounts/tables.js';
import { Reports } from '/imports/api/payaccounts/reports.js';

import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '../common/ibox-tools.js';
import '../components/balance-widget.js';
import './parcels-finances.html';

Template.Parcels_finances.onCreated(function parcelsFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payaccounts.inCommunity', { communityId });
    this.subscribe('payments.inCommunity', { communityId });
  });
});

Template.Parcels_finances.helpers({
  report(name, year) {
    return Reports[name](year);
  },
  paymentsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      const myParcelIds = Memberships.find({ communityId, 'active.now': true, role: 'owner', 'person.userId': Meteor.userId() }).map(m => m.parcel().serial.toString());
      return Payments.find({ communityId, 'accounts.Könyvelés helye': { $in: myParcelIds }, phase: 'done' }).fetch();
    }
    return getTableData;
  },
  billsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      const myParcelIds = Memberships.find({ communityId, 'active.now': true, role: 'owner', 'person.userId': Meteor.userId() }).map(m => m.parcel().serial.toString());
//      console.log('myParcelIds', myParcelIds);
      const myBills = Payments.find({ communityId, 'accounts.Könyvelés helye': { $in: myParcelIds }, phase: 'bill' }).fetch();
//      console.log('myBills', myBills);
      return myBills;
    }
    return getTableData;
  },
  paymentsOptionsFn() {
    const communityId = Session.get('activeCommunityId');
    const accounts = PayAccounts.find({ communityId }).fetch();
    function getOptions() {
      return {
        columns: paymentColumns(accounts),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});
