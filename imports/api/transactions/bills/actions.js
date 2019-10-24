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
import './methods.js';

export function allBillsActions() {
  Bills.actions = Bills.actions || {
    collection: Bills,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      visible: () => currentUserHasPermission('bills.insert'),
      run(id, event, instance) {
        const activeBillCategory = instance.viewmodel.activeBillCategory();
        Session.set('activeBillCategory', activeBillCategory);
        Modal.show('Autoform_edit', {
          id: 'af.bill.insert',
          collection: Bills,
          omitFields: ['payments'],
          type: 'method',
          meteormethod: 'bills.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
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
          title: __('bill') + ' ' + doc.serialId(),
          body: 'Bill_show',
          bodyContext: { doc },
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      visible(id) {
        if (!currentUserHasPermission('bills.update')) return false;
        const doc = Bills.findOne(id);
        if (doc.txId) return false; // already in accounting
        return true;
      },
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.bill.update',
          collection: Bills,
          omitFields: ['payments'],
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
          fields: ['partner', 'account', 'localizer'],
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
          type: 'method',
          meteormethod: 'payments.insert',
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      visible: () => currentUserHasPermission('bills.remove'),
      run(id) {
        Modal.confirmAndCall(Bills.methods.remove, { _id: id }, {
          action: 'delete bill',
          message: 'It will disappear forever',
        });
      },
    },
  };
  return Bills.actions;
}

export function getBillsActionsSmall() {
  allBillsActions();
  const actions = [
    Bills.actions.view,
    Bills.actions.edit,
    Bills.actions.conteer,
    Bills.actions.registerPayment,
    Bills.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addModalHooks('af.bill.conteer');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = Session.get('activeBillCategory');
    return doc;
  },
});
