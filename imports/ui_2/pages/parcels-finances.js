import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Communities } from '/imports/api/communities/communities.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { remove as removePayment, billParcels } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { paymentColumns } from '/imports/api/payments/tables.js';
import { payaccountColumns } from '/imports/api/payaccounts/tables.js';
import { Reports } from '/imports/api/payaccounts/reports.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../components/collapse-section.js';
import '../components/sumif-table.js';
import '../components/custom-table.js';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
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
      const myParcelIds = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());
      return Payments.find({ communityId, 'accounts.Könyvelés helye': { $in: myParcelIds }, phase: 'done' }).fetch();
    }
    return getTableData;
  },
  billsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      const myParcelIds = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());
      return Payments.find({ communityId, 'accounts.Könyvelés helye': { $in: myParcelIds }, phase: 'bill' }).fetch();
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
