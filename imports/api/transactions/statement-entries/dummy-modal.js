import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from './statement-entries.js';
import './dummy-modal.html';

Template.Dummy_modal.onCreated(function () {
//        ModalStack.setCallback({
//          method: 'statementEntries.reconcile',
//          params: {
//            _id: doc._id,
//            txId: ModalStack.readResult(null, 'af.transaction.insert'),
//          },
//        });
});

Template.Dummy_modal.onRendered(function () {
  const instance = this;
  const tx = this.data.doc;
  const options = this.data.options;
  const se = ModalStack.getVar('statementEntry');

  Tracker.autorun((computation) => {
    const result = ModalStack.readResult('dummy', `af.${tx.category}.insert`);
    if (result) {
      computation.stop();
      StatementEntries.methods.reconcile.call({ _id: se._id, txId: result });
      Modal.hide(instance.parent(3));
    }
  });
  Transactions.actions.new(options, tx).run();
});
