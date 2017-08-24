import { Template } from 'meteor/templating';
import { Payments } from '/imports/api/payments/payments.js';
import { remove as removePayment } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { paymentColumns } from '/imports/api/payments/tables.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './finances.html';

Template.Finances.onCreated(function financesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payaccounts.inCommunity', { communityId });
    this.subscribe('payments.inCommunity', { communityId });
  });
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
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.payments.insert',
      collection: Payments,
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'payments.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.payments.update',
      collection: Payments,
      omitFields: ['communityId'],
      doc: Payments.findOne(id),
      type: 'method-update',
      meteormethod: 'payments.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removePayment, { _id: id }, {
      action: 'delete payment',
    });
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
