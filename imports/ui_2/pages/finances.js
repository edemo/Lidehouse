import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { PayAccounts } from '/imports/api/payments/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { remove as removePayment } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { paymentColumns, payaccountColumns } from '/imports/api/payments/tables.js';
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
  dataEgyenlegek() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Számla fiók' });
    return {
      name: 'Egyenlegek',
      filter: { phase: 'done' },
      rows: [
        { field: 'accounts.Számla fiók', values: accountLots.init().leafNames },
      ],
      cols: [],
    };
  },
  dataEvesBevetelek() {
    const communityId = Session.get('activeCommunityId');
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    return {
      name: 'Éves bevételek',
      rows: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames, total: 'Bevételek' },
      ],
      cols: [
        { field: 'year', values: [2016, 2017] },
        { field: 'phase', values: ['bill', 'done'] },
      ],
    };
  },
  dataHaviBevetelek(year) {
    const communityId = Session.get('activeCommunityId');
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    return {
      name: `Havi bevételek (${year})`,
      filter: { year, phase: 'done' },
      rows: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames, total: 'Bevételek' },
      ],
      cols: [
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year },
      ],
    };
  },
  dataAlbetetekSzamlai(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Fizetési hely' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    return {
      name: `Albetétek Számlái (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Fizetési hely', values: locator.init().leafNames },
      ],
      cols: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames, total: 'Albetét folyószámla' },
        { field: 'phase', values: ['bill', 'done'] },
      ],
    };
  },
  dataAlbetetemElszamolasa(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Fizetési hely' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Elszámolása (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Fizetési hely', values: myParcels },
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year },
      ],
      cols: [
        { field: 'accounts.Befizetés nem', values: befnem.init().leafNames },
        { field: 'phase', values: ['bill', 'done'] },
      ],
    };
  },
  dataNyito() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Számla fiók' });
    return {
      name: 'Nyitó',
      filter: { phase: 'done', ref: 'nyitó' },
      rows: [
        { field: 'accounts.Számla fiók', values: accountLots.init().leafNames },
      ],
      cols: [],
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
