import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Bills } from './bills.js';
import { Payments } from '../payments/payments.js';
import '/imports/ui_3/views/modals/bill-edit.js';

import './methods.js';

Bills.actions = {
  new: {
    name: 'new',
    icon: 'fa fa-plus',
    multi: false,
    visible: () => currentUserHasPermission('bills.insert'),
    run(id, event, instance) {
      const activePartnerRelation = instance.viewmodel.activePartnerRelation();
      Session.set('activePartnerRelation', activePartnerRelation);
      Modal.show('Bill_edit', {
        id: 'af.bill.insert',
        collection: Bills,
        type: 'method',
        meteormethod: 'bills.insert',
        validation: 'blur',
      });
    },
  },
  view: {
    name: 'view',
    icon: 'fa fa-eye',
    multi: false,
    visible: () => currentUserHasPermission('bills.inCommunity'),
    run(id) {
      const doc = Bills.findOne(id);
/*        Modal.show('Autoform_edit', {
        id: 'af.bill.view',
        collection: Bills,
        doc,
        type: 'readonly',
      });*/
//        FlowRouter.go('Bill show', { _bid: id });
      Modal.show('Modal', {
        title: __(doc.relation + '_bill') + ' ' + doc.serialId(),
        body: 'Bill_show',
        bodyContext: { doc },
      });
    },
  },
  edit: {
    name: 'edit',
    icon: 'fa fa-pencil',
    multi: false,
    visible(id) {
      if (!currentUserHasPermission('bills.update')) return false;
      const doc = Bills.findOne(id);
      if (doc.txId) return false; // already in accounting
      return true;
    },
    run(id) {
      Modal.show('Bill_edit', {
        id: 'af.bill.update',
        collection: Bills,
        doc: Bills.findOne(id),
        type: 'method-update',
        meteormethod: 'bills.update',
        singleMethodArgument: true,
      });
    },
  },
  conteer: {
    name: 'conteer',
    icon: 'fa fa-edit',
    multi: true,
    color: _id => (!(Bills.findOne(_id).txId) ? 'warning' : undefined),
    visible(id) {
      if (!currentUserHasPermission('bills.conteer')) return false;
      const doc = Bills.findOne(id);
      return (doc.hasConteerData() && !doc.txId);
    },
    run(id) {
/*        Modal.show('Autoform_edit', {
        id: 'af.bill.conteer',
        collection: Bills,
        fields: ['partnerId', 'account', 'localizer'],
        doc: Bills.findOne(id),
        type: 'method-update',
        meteormethod: 'bills.conteer',
        singleMethodArgument: true,
      });*/
      Bills.methods.conteer.call({ _id: id }, onSuccess((res) => {
        displayMessage('info', 'Szamla konyvelesbe kuldve');
      }));
    },
  },
  registerPayment: {
    name: 'registerPayment',
    icon: 'fa fa-credit-card',
    multi: false,
    visible(id) {
      if (!currentUserHasPermission('payments.insert')) return false;
      const doc = Bills.findOne(id);
      return (!!doc.txId && doc.outstanding > 0);
    },
    run(id) {
      Session.set('activeBillId', id);
      Modal.show('Autoform_edit', {
        id: 'af.payment.insert',
        collection: Payments,
        omitFields: ['partnerId'],
        type: 'method',
        meteormethod: 'payments.insert',
      });
    },
  },
  remove: {
    name: 'remove',
    icon: 'fa fa-trash',
    multi: true,
    visible: () => currentUserHasPermission('bills.remove'),
    run(id) {
      Modal.confirmAndCall(Bills.methods.remove, { _id: id }, {
        action: 'delete bill',
        message: 'It will disappear forever',
      });
    },
  },
};

//------------------------------------------

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addModalHooks('af.bill.conteer');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.relation = Session.get('activePartnerRelation');
    Bills.autofillLines(doc);
    return doc;
  },
});
