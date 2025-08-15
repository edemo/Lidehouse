import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/accounting/actions.js';
import '/imports/ui_3/views/components/doc-view.js';
import './reconciliation.html';

export function reconcileSeHandlingErr(seId, txId, entity) {
  StatementEntries.methods.reconcile.call({ _id: seId, txId },
    (err) => {
      if (err && txId) {
        Transactions.methods.remove.call({ _id: txId });
        displayError(err);
        displayMessage('success', __(entity) + ' ' + __('actions.delete.done'));
      }
    });
}

Template.Reconciliation.viewmodel({
  originalStatementEntry() {
    return ModalStack.getVar('statementEntry')?.original;
  },
});

Template.Reconciliation.onRendered(function () {
  const instance = this;
//  const tx = this.data.doc;
//  const options = this.data.options;
  const se = ModalStack.getVar('statementEntry');
  instance.data.newTransactionLaunched = false;
  instance.autorun((computation) => {
    const defId = AutoForm.getFieldValue('defId');
    if (!defId) return;
    const txdef = Txdefs.findOneT(defId);
    const newDoc = ModalStack.getVar('newDoc');
    Transactions.setTxdef(newDoc, txdef);
    ModalStack.setVar('newDoc', newDoc, true);
    const newCreatedTxId = ModalStack.readResult('af.statementEntry.reconcile', `af.${txdef.category}.create`);
    if (newCreatedTxId) {
      computation.stop();
      Meteor.setTimeout(() => {
        reconcileSeHandlingErr(se._id, newCreatedTxId, txdef.category);
        Modal.hide(instance.parent(3));
      }, 1000);
    }
    const communityId = txdef.communityId;
    const hasSuchUnreconciledTx = Transactions.findOne({ communityId, defId, status: { $ne: 'void' }, reconciled: false });
    const reconciledFromList = Session.get('reconciledFromList');
    if (reconciledFromList) { // in case there was only one tx in the list which has been reconciled now
      computation.stop();
      Meteor.setTimeout(() => { Session.set('reconciledFromList'); }, 1000);
    }
    if (!hasSuchUnreconciledTx && !reconciledFromList) {
      if (!instance.data.newTransactionLaunched) {
        instance.data.newTransactionLaunched = true;
        const newTx = {}; Transactions.setTxdef(newTx, txdef);
        Transactions.actions.create({}, newTx).run();
      }
    }
  });
});
