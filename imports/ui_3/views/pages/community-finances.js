/* globals document */
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

import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { monthTags } from '/imports/api/payaccounts/payaccounts-utils.js';
import { paymentColumns } from '/imports/api/payments/tables.js';
import { payaccountColumns } from '/imports/api/payaccounts/tables.js';
import { Reports } from '/imports/api/payaccounts/reports.js';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import './community-finances.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Community_finances.onCreated(function communityFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payaccounts.inCommunity', { communityId });
    this.subscribe('payments.inCommunity', { communityId });
  });
});

Template.Community_finances.onRendered(function communityFinancesOnRendered() {
  // Filling the Balance Sheet chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Bank főszámla'), __('Bank felújítási alap'), __('Hitelszámla'), __('Pénztár')],
      datasets: [{
        data: [6943500, 120000, 2300000, 100000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('balanceSheetChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });

  // Filling the History chart with DEMO data
  this.autorun(() => {
    const monthsArray = monthTags.children[0].children[0].children.map(c => c.label);
    const barData = {
      labels: monthsArray,
      datasets: [{
        label: __('Bevételek (e Ft)'),
        data: [425, 425, 425, 425, 480, 428, 2725, 425, 1765, 925, 425, 425],
        backgroundColor: choiceColors[0],
        borderWidth: 2,
      }, {
        label: __('Kiadások (e Ft)'),
        data: [510, 520, 530, 500, 550, 510, 800, 1800, 880, 510, 550, 520],
        backgroundColor: choiceColors[1],
        borderWidth: 2,
      }],
    };
    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('historyChart').getContext('2d');
    new Chart(elem, { type: 'bar', data: barData, options: barOptions });
  });

  // Filling the Incomes chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Lakói befizetések'), __('Kamat pénzintézetektől'), __('Hitelfelvétel'), __('Adóköteles bevételek'), __('Támogatás')],
      datasets: [{
        data: [6440000, 2150, 2300000, 558500, 500000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('incomesChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });

  // Filling the Expenses chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Költségek'), __('Beruházások'), __('Hiteltörlesztés')],
      datasets: [{
        data: [5000000, 2000000, 1000000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('expensesChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });
});

Template.Community_finances.helpers({
  communityStatusReportTitle() {
    return `${__('community')} ${__('status report')}`;
  },
  report(name, year) {
    if (!PayAccounts.find().count()) return Reports['Blank']();
    if (!Template.instance().subscriptionsReady()) return Reports['Blank']();
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
      obj[payaccount.name] = { type: String, optional: true, label: payaccount.name, autoform: { options() { return payaccount.leafOptions(); }, firstOption: () => __('(Select one)') } };
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
      autoform: { options() { return payaccount1.leafOptions(l => l.membersRelated); }, firstOption: () => __('(Select one)') },
    };
    obj[payaccount2.name] = { type: String, optional: true, label: payaccount2.name, 
      autoform: { options() { return payaccount2.nodeOptions(); }, firstOption: () => __('(Select one)') },
    };
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    ParcelBillings.simpleSchema(),
    { accounts: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

Template.Community_finances.events({
  'click #payaccounts .js-new'(event, instance) {
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
  'click #payaccounts .js-edit'(event) {
    const id = $(event.target).data('id');
    const payaccount = PayAccounts.findOne(id);
    const modalContext = {
      title: 'Edit Payaccount',
      body: 'Nestable_edit',
      bodyContext: { json: payaccount },
      btnClose: 'cancel',
      btnOK: 'save',
      onOK() {
        const json = serializeNestable();
        // console.log('saving nestable:', JSON.stringify(json));
        // assert json.length === 1
        // assert json[0].name === payaccount.name
        // assert locked elements are still there 
        PayAccounts.update(id, { $set: { children: json[0].children } },
          onSuccess(res => displayMessage('success', 'PayAccount saved'))
        );
      },
    };
    Modal.show('Modal', modalContext);
  },
  'click #payaccounts .js-edit-af'(event) {
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
  'click #payaccounts .js-view'(event, instance) {
    const id = $(event.target).data('id');
    const payaccount = PayAccounts.findOne(id);
    const modalContext = {
      title: 'View Payaccount',
      body: 'Nestable_edit',
      bodyContext: { json: payaccount, disabled: true },
    };
    Modal.show('Modal', modalContext);
  },
  'click #payaccounts .js-view-af'(event, instance) {
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
  'click #payaccounts .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(PayAccounts.remove, { _id: id }, {
      action: 'delete payaccount',
    });
  },
  'click #payments .js-new'(event, instance) {
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
  'click #payments .js-edit'(event) {
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
  'click #payments .js-view'(event) {
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
  'click #payments .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete payment',
    });
  },
  'click #bills .js-new'(event, instance) {
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
  'click #bills .js-edit'(event) {
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
  'click #bills .js-view'(event) {
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
  'click #bills .js-many'(event, instance) {
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
  'click #bills .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete bill',
    });
  },
  'click #bills .js-bill'(event) {
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
