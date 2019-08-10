import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { matchBillSchema } from '/imports/api/transactions/bills/bills.js';
import { Transactions } from './transactions.js';
import './methods.js';

export function allTransactionsActions() {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  Transactions.actions = Transactions.actions || {
    collection: Transactions,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      permission: user.hasPermission('transactions.insert', communityId),
      run(defId) {
        Session.set('activeTxDef', defId);
        const def = TxDefs.findOne({ name: defId });
        Modal.show('Autoform_edit', {
          id: 'af.transaction.insert',
          collection: Transactions,
          schema: def.schema(),
    //      type: 'method',
    //      meteormethod: 'transactions.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      permission: user.hasPermission('transactions.inCommunity', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.transaction.view',
          collection: Transactions,
          schema: Transactions.inputSchema,
          doc: Transactions.findOne(id),
          type: 'readonly',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      permission: user.hasPermission('transactions.update', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.transaction.update',
          collection: Transactions,
    //      schema: newTransactionSchema(),
          doc: Transactions.findOne(id),
          type: 'method-update',
          meteormethod: 'transactions.update',
          singleMethodArgument: true,
        });
      },
    },
    reconcile: {
      name: 'reconcile',
      icon: 'fa fa-edit',
      permission: user.hasPermission('transactions.reconcile', communityId),
      run(id) {
        Session.set('activeTransactionId', id);
        Modal.show('Autoform_edit', {
          id: 'af.transaction.reconcile',
          collection: Transactions,
          schema: matchBillSchema(),
          type: 'method',
          meteormethod: 'transactions.reconcile',
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      permission: user.hasPermission('transactions.remove', communityId),
      run(id) {
        const tx = Transactions.findOne(id);
        Modal.confirmAndCall(Transactions.methods.remove, { _id: id }, {
          action: 'delete transaction',
          message: tx.isSolidified() ? 'Remove not possible after 24 hours' : '',
        });
      },
    },
  };
  return Transactions.actions;
}

export function getTransactionsActionsSmall() {
  allTransactionsActions();
  const actions = [
    Transactions.actions.view,
    Transactions.actions.edit,
    Transactions.actions.reconcile,
    Transactions.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.transaction.insert');
AutoForm.addModalHooks('af.transaction.update');
AutoForm.addModalHooks('af.transaction.reconcile');

AutoForm.addHooks('af.transaction.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.transaction.insert');
    const defId = Session.get('activeTxDef');
    const def = TxDefs.findOne({ name: defId });
    def.transformToTransaction(doc);
    const afContext = this;
    Transactions.methods.insert.call(doc, function handler(err, res) {
      if (err) {
//        displayError(err);
        afContext.done(err);
        return;
      }
      afContext.done(null, res);
    });
    return false;
  },
});
