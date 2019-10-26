import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Payments } from '../payments/payments.js';
import { Bills } from '../bills/bills.js';
import './methods.js';

export function allPaymentsActions() {
  Payments.actions = Payments.actions || {
    collection: Payments,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      visible: () => currentUserHasPermission('payments.insert'),
      run(id, event, instance) {
        const activePartnerRelation = instance.viewmodel.activePartnerRelation();
        Session.set('activePartnerRelation', activePartnerRelation);
        Modal.show('Autoform_edit', {
          id: 'af.bill.insert',
          collection: Payments,
          omitFields: ['category'],
          type: 'method',
          meteormethod: 'payments.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      visible: () => currentUserHasPermission('payments.inCommunity'),
      run(id) {
        const doc = Payments.findOne(id);
        // TODO
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      visible(id) {
        if (!currentUserHasPermission('bills.update')) return false;
        const doc = Payments.findOne(id);
        if (doc.txId) return false; // already in accounting
        return true;
      },
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.payment.update',
          collection: Payments,
          doc: Payments.findOne(id),
          type: 'method-update',
          meteormethod: 'payments.update',
          singleMethodArgument: true,
        });
      },
    },
    conteer: {
      name: 'conteer',
      icon: 'fa fa-edit',
      color: _id => (!(Payments.findOne(_id).txId) ? 'warning' : undefined),
      visible(id) {
        if (!currentUserHasPermission('payments.conteer')) return false;
        const doc = Payments.findOne(id);
        return (!doc.txId);
      },
      run(id) {
        Payments.methods.conteer.call({ _id: id }, onSuccess((res) => {
          displayMessage('info', 'Kifizetes konyvelesbe kuldve');
        }));
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      visible: () => currentUserHasPermission('payments.remove'),
      run(id) {
        Modal.confirmAndCall(Payments.methods.remove, { _id: id }, {
          action: 'delete bill',
          message: 'It will disappear forever',
        });
      },
    },
  };
  return Payments.actions;
}

export function getPaymentsActionsSmall() {
  allPaymentsActions();
  const actions = [
//    Payments.actions.view,
    Payments.actions.edit,
    Payments.actions.conteer,
    Payments.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.payment.insert');
AutoForm.addModalHooks('af.payment.update');
AutoForm.addModalHooks('af.payment.conteer');

AutoForm.addHooks('af.payment.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    const billId = Session.get('activeBillId');
    if (billId) {
      const bill = Bills.findOne(billId);
      doc.category = bill.category;
      doc.billId = billId;
    } else {
      doc.category = Session.get('activePartnerRelation');
    }
    Session.set('activeBillId', undefined);
    return doc;
  },
});
