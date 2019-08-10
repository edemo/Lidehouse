import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { Bills } from './bills.js';
import './methods.js';

export function allBillsActions() {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  Bills.actions = Bills.actions || {
    collection: Bills,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      permission: user.hasPermission('bills.insert', communityId),
      run(id, event, instance) {
        const activeBillCategory = instance.viewmodel.activeBillCategory();
        Session.set('activeBillCategory', activeBillCategory);
        Modal.show('Autoform_edit', {
          id: 'af.bill.insert',
          collection: Bills,
          omitFields: ['category', 'payments'],
          type: 'method',
          meteormethod: 'bills.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      permission: user.hasPermission('bills.inCommunity', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.bill.view',
          collection: Bills,
          omitFields: ['category'],
          doc: Bills.findOne(id),
          type: 'readonly',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      permission: user.hasPermission('bills.update', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.bill.update',
          collection: Bills,
          omitFields: ['category'],
          doc: Bills.findOne(id),
          type: 'method-update',
          meteormethod: 'bills.update',
        });
      },
    },
    pay: {
      name: 'pay',
      icon: 'fa fa-edit',
      permission: user.hasPermission('transactions.reconcile', communityId),
      run(id) {
        Session.set('activeBillId', id);
        Modal.show('Autoform_edit', {
          id: 'af.bill.pay',
          collection: Bills,
          schema: Bills.paymentSchema,
          type: 'method',
          meteormethod: 'transactions.reconcile',
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      permission: user.hasPermission('bills.remove', communityId),
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
    Bills.actions.pay,
    Bills.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addModalHooks('af.bill.pay');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = Session.get('activeBillCategory');
    return doc;
  },
});

AutoForm.addHooks('af.bill.pay', {
  formToDoc(doc) {
    doc._id = Session.get('activeBillId');
    return doc;
  },
});

