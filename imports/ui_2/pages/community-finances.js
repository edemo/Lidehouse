import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Communities } from '/imports/api/communities/communities.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { remove as removePayment, billParcels } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';

import { paymentColumns } from '/imports/api/payments/tables.js';
import { payaccountColumns } from '/imports/api/payaccounts/tables.js';
import { Reports } from '/imports/api/payaccounts/reports.js';
import '../components/collapse-section.js';
import '../components/sumif-table.js';
import '../components/custom-table.js';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './community-finances.html';

Template.Community_finances.onCreated(function communityFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payaccounts.inCommunity', { communityId });
    this.subscribe('payments.inCommunity', { communityId });
  });
});

Template.Community_finances.helpers({
  communityStatusReportTitle() {
    return `${__('community')} ${__('status report')}`;
  },
  report(name, year) {
    return Reports[name](year);
  },
  payaccountsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return PayAccounts.find({ communityId }).fetch();
    }
    return getTableData;
  },
  payaccountsOptionsFn() {
    function getOptions() {
      return {
        columns: payaccountColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        paging: false,
        info: false,
      };
    }
    return getOptions;
  },
  paymentsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Payments.find({ communityId, phase: 'done' }).fetch();
    }
    return getTableData;
  },
  billsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Payments.find({ communityId, phase: 'bill' }).fetch();
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
  afCommunityFinancesData() {
    const communityId = Session.get('activeCommunityId');
    const financesOnlySchema = Communities.simpleSchema().pick(['finances', 'finances.ccArea', 'finances.ccVolume', 'finances.ccHabitants']);
    return {
      id: 'af.communities.finances',
      collection: Communities,
      schema: financesOnlySchema,
      doc: Communities.findOne(communityId),
      type: 'method-update',
      meteormethod: 'communities.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    };
  },
});

function newPaymentSchema() {
  function chooseAccountsSchema() {
    const obj = {};
    const communityId = Session.get('activeCommunityId');
    const payaccounts = PayAccounts.find({ communityId });
    payaccounts.forEach((payaccount) => {
      obj[payaccount.name] = { type: String, optional: true, label: payaccount.name, autoform: { options() { return payaccount.leafOptions(); } } };
    });
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    Payments.simpleSchema(),
    { accounts: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

function newParcelBillingSchema() {
  function chooseAccountsSchema() {
    const obj = {};
    const communityId = Session.get('activeCommunityId');
    const payaccount1 = PayAccounts.findOne({ communityId, name: 'Könyvelés nem' });
    const payaccount2 = PayAccounts.findOne({ communityId, name: 'Könyvelés helye' });
    obj[payaccount1.name] = { type: String, optional: true, label: payaccount1.name, 
      autoform: { options() { return payaccount1.leafOptions(l => l.membersRelated); } },
    };
    obj[payaccount2.name] = { type: String, optional: true, label: payaccount2.name, 
      autoform: { options() { return payaccount2.nodeOptions(); } },
    };
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    ParcelBillings.simpleSchema(),
    { accounts: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

Template.Community_finances.events({
  'click #payaccounts-pane .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.payaccount.insert',
      collection: PayAccounts,
      omitFields: ['communityId'],
      type: 'insert',
      //      type: 'method',
//      meteormethod: 'payaccounts.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #payaccounts-pane .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payaccount.update',
      collection: PayAccounts,
      omitFields: ['communityId'],
      doc: PayAccounts.findOne(id),
      type: 'update',
//      type: 'method-update',
//      meteormethod: 'payments.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #payaccounts-pane .js-view'(event, instance) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payaccount.view',
      collection: PayAccounts,
      omitFields: ['communityId'],
      doc: PayAccounts.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #payaccounts-pane .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(PayAccounts.remove, { _id: id }, {
      action: 'delete payaccount',
    });
  },
  'click #payments-pane .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.payment.insert',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      type: 'method',
      meteormethod: 'payments.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #payments-pane .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payment.update',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      doc: Payments.findOne(id),
      type: 'method-update',
      meteormethod: 'payments.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #payments-pane .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payment.view',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      doc: Payments.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #payments-pane .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete payment',
    });
  },
  'click #bills-pane .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.bill.insert',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      type: 'method',
      meteormethod: 'bills.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills-pane .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.update',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      doc: Payments.findOne(id),
      type: 'method-update',
      meteormethod: 'bills.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #bills-pane .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.view',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId', 'phase'],
      doc: Payments.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills-pane .js-many'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.insert',
      collection: ParcelBillings,
      schema: newParcelBillingSchema(),
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'parcelBillings.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills-pane .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete bill',
    });
  },
  'click #bills-pane .js-bill'(event) {
    const communityId = Session.get('activeCommunityId');
    Modal.confirmAndCall(billParcels, { communityId }, {
      action: 'bill parcels',
      message: 'This will bill all parcels',
    });
  },
});

AutoForm.addModalHooks('af.payaccount.insert');
AutoForm.addModalHooks('af.payaccount.update');
AutoForm.addHooks('af.payaccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.payment.insert');
AutoForm.addModalHooks('af.payment.update');
AutoForm.addHooks('af.payment.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.phase = 'done';
    // When entering expenses into the system, we enter them as positive number, but should appear with minus in the sheet
    const payaccount = PayAccounts.findOne({ communityId: doc.communityId, name: 'Könyvelés nem' });
    const leafName = doc.accounts['Könyvelés nem'];
    const leaf = payaccount.leafFromName(leafName);
    const category = leaf.level1;
    if (category.name === 'Kiadások') doc.amount *= -1;
    return doc;
  },
});

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.phase = 'plan';
    doc.amount *= -1;
    return doc;
  },
});

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
