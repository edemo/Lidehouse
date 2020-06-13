import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import '/imports/ui_3/views/components/reconciliation.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
import './dummy-modal.js';
import './methods.js';

StatementEntries.actions = {
  new: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('statements.insert', doc),
    run(event, instance) {
//      ModalStack.setVar('account', instance.viewmodel.accountSelected());
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.insert',
        collection: StatementEntries,
        omitFields: ['original', 'match'],
        doc: {
          communityId: getActiveCommunityId(),
          account: instance.viewmodel.accountSelected(),
          valueDate: new Date(),
        },
        type: 'method',
        meteormethod: 'statementEntries.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('statements.upsert', doc),
    run(event, instance) {
      const accountCode = instance.viewmodel.accountSelected();
      const account = Accounts.findOne({ communityId: getActiveCommunityId(), code: accountCode });
      const format = (account.category === 'bank' && account.bank) || (account.category === 'cash' && 'CR') || 'default';
      importCollectionFromFile(StatementEntries, {
        format,
        keepOriginals: true,
        dictionary: {
          communityId: { default: getActiveCommunityId() },
          account: { default: accountCode },
          statementId: { default: undefined },
        },
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('statements.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.view',
        collection: StatementEntries,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('statements.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.update',
        collection: StatementEntries,
        omitFields: ['original', 'match'],
        doc,
        type: 'method-update',
        meteormethod: 'statementEntries.update',
        singleMethodArgument: true,
      });
    },
  }),
  reconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'reconcile',
    label: (options.txdef && options.txdef.name) || __('reconcile'),
    icon: 'fa fa-external-link',
    color: (doc.match) ? 'info' : 'danger',
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    subActions: !options.txdef && Txdefs.find({ communityId: doc.communityId }).fetch().filter(td => td.isReconciledTx())
      .map(txdef => StatementEntries.actions.reconcile({ txdef }, doc, user)),
    run() {
      ModalStack.setVar('txdef', options.txdef);
      ModalStack.setVar('statementEntry', doc);
      const tx = {
        communityId: doc.communityId,
        defId: options.txdef._id,
        category: options.txdef.category,
        relation: options.txdef.data.relation,
        amount: doc.amount,
        valueDate: doc.valueDate,
      };
      const hasSuchUnreconlicedTx = Transactions.findOne(_.extend(tx, { seId: { $exists: false } }));
      if (hasSuchUnreconlicedTx) {
        Modal.show('Autoform_modal', {
          title: `${__('Reconciliation')} >> ${__(options.txdef.name)}`,
          id: 'af.statementEntry.reconcile',
          schema: StatementEntries.reconcileSchema,
          type: 'method',
          meteormethod: 'statementEntries.reconcile',
        });
 /*           Modal.show('Autoform_modal', {
          body: 'Reconciliation',
          bodyContext: { doc: tx },
          // --- --- --- ---
          id: 'af.statementEntry.reconcile',
          schema: Transactions.simpleSchema({ category: tx.category }),
          doc: tx,
          type: 'method',
          meteormethod: 'statementEntries.reconcile',
          // --- --- --- ---
          size: 'lg',
        });*/
      } else {
        Modal.show('Modal', {
          body: 'Dummy_modal',
          bodyContext: { doc: tx, options },
          id: 'dummy',
        });
      }
    },
  }),
  autoReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'autoReconcile',
    icon: 'fa fa-external-link',
    color: 'primary',
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.reconcile.call({ _id: doc._id });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('transactions.remove', doc),
    run() {
      Modal.confirmAndCall(StatementEntries.methods.remove, { _id: doc._id }, {
        action: 'delete statementEntry',
      });
    },
  }),
};

StatementEntries.dummyDoc = {
  communityId: getActiveCommunityId,
  isReconciled() { return false; },
};

StatementEntries.batchActions = {
  autoReconcile: new BatchAction(StatementEntries.actions.autoReconcile, StatementEntries.methods.batch.reconcile, {}, StatementEntries.dummyDoc),
  delete: new BatchAction(StatementEntries.actions.delete, StatementEntries.methods.batch.remove),
};

//--------------------------------------------------------

AutoForm.addModalHooks('af.statementEntry.insert');
AutoForm.addModalHooks('af.statementEntry.update');
AutoForm.addModalHooks('af.statementEntry.reconcile');

AutoForm.addHooks('af.statementEntry.insert', {
  docToForm(doc) {
//    doc.account = ModalStack.getVar('account');
    return doc;
  },
});

AutoForm.addHooks(['af.statementEntry.view', 'af.statementEntry.insert', 'af.statementEntry.update'], {
  formToDoc(doc) {
    if (doc.original) doc.original = JSON.parse(doc.original);
    return doc;
  },
  docToForm(doc) {
    if (doc.original) doc.original = JSON.stringify(doc.original || {}, null, 2);
    return doc;
  },
  formToModifier(modifier) {
    if (modifier.$set.original) modifier.$set.original = JSON.parse(modifier.$set.original);
    return modifier;
  },
});

AutoForm.addHooks('af.statementEntry.reconcile', {
  formToDoc(doc) {
    doc._id = ModalStack.getVar('statementEntry')._id;
    return doc;
  },
});
