import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import '/imports/api/transactions/actions.js';
import './reconciliation.html';

Template.Reconciliation.onRendered(function () {
  const instance = this;
  const tx = this.data.doc;
  const options = this.data.options;
  const se = ModalStack.getVar('statementEntry');

  const hasSuchUnreconlicedTx = Transactions.findOne(_.extend(tx, { seId: { $exists: false } }));
  if (!hasSuchUnreconlicedTx) {
    Tracker.autorun((computation) => {
      const result = ModalStack.readResult('dummy', `af.${tx.category}.insert`);
      if (result) {
        computation.stop();
        StatementEntries.methods.reconcile.call({ _id: se._id, txId: result });
        Modal.hide(instance.parent(3));
      }
    });
    Transactions.actions.new(options, tx).run();
  }
});
