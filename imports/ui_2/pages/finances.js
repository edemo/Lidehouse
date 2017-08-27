import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { PayAccounts } from '/imports/api/payments/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { remove as removePayment } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { paymentColumns, payaccountColumns } from '/imports/api/payments/tables.js';
import { reportColumns } from '/imports/api/payments/reports.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import '../components/sumif-table.js';
import './finances.html';

Template.Finances.onCreated(function financesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payaccounts.inCommunity', { communityId });
    this.subscribe('payments.inCommunity', { communityId });
  });
});

Template.Finances.helpers({
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
      };
    }
    return getOptions;
  },
  paymentsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Payments.find({ communityId }).fetch();
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
  reportsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Payments.find({ communityId }).fetch();
    }
    return getTableData;
  },
  reportsOptionsFn() {
    function getOptions() {
      return {
        columns: reportColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
  dataAlbetetekSzamlai(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Fizetési hely' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    return {
      name: 'Albetetek Szamlai',
      filter: { year },
      rows: [
        { field: 'accounts.Fizetési hely', values: locator.init().leafNames },
      ],
      cols: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames },
        { field: 'phase', values: ['bill', 'done'] },
      ],
    };
  },
  dataAlbetetemElszamolasa(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Fizetési hely' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    return {
      name: 'Albetetem Elszamolasa',
      filter: { year, 'accounts.Fizetési hely': '4' },
      rows: [
        { field: 'accounts.Fizetési hely', values: locator.init().leafNames },
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], sum: year },
      ],
      cols: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames },
        { field: 'phase', values: ['bill', 'done'] },
      ],
    };
  },
});

function newPaymentSchema() {
  function chooseAccountsSchema() {
    const obj = {};
    const communityId = Session.get('activeCommunityId');
    const payaccounts = PayAccounts.find({ communityId });
    payaccounts.forEach((payaccount) => {
      obj[payaccount.name] = { type: String, optional: true, label: payaccount.name, allowedValues: payaccount.leafDisplays() };
    });
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    Payments.simpleSchema(),
    { accounts: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

Template.Finances.events({
  'click #tab-content0 .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.payaccounts.insert',
      collection: PayAccounts,
      omitFields: ['communityId'],
      type: 'insert',
      //      type: 'method',
//      meteormethod: 'payaccounts.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #tab-content0 .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payaccounts.update',
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
  'click #tab-content0 .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(PayAccounts.remove, { _id: id }, {
      action: 'delete payaccount',
    });
  },

  'click #tab-content1 .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.payments.insert',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'payments.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #tab-content1 .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payments.update',
      collection: Payments,
      schema: newPaymentSchema(),
      omitFields: ['communityId'],
      doc: Payments.findOne(id),
      type: 'method-update',
      meteormethod: 'payments.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #tab-content1 .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete payment',
    });
  },
});

AutoForm.addModalHooks('af.payaccounts.insert');
AutoForm.addModalHooks('af.payaccounts.update');
AutoForm.addHooks('af.payaccounts.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.payments.insert');
AutoForm.addModalHooks('af.payments.update');
AutoForm.addHooks('af.payments.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
