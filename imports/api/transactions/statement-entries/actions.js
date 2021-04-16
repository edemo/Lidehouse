import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { Relations } from '/imports/api/core/relations.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
import { reconciliationSchema } from '/imports/api/transactions/reconciliation/reconciliation.js';
import '/imports/ui_3/views/components/reconciliation.js';
import '/imports/ui_3/views/components/doc-view.js';
import './methods.js';
import { Transactions } from '../transactions.js';

StatementEntries.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission('statements.insert', doc),
    run(event, instance) {
//      ModalStack.setVar('account', instance.viewmodel.accountSelected());
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.create',
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
      if (Meteor.isDevelopment) {
        Modal.show('Autoform_modal', {
          id: 'af.statementEntry.view',
          collection: StatementEntries,
          doc,
          type: 'readonly',
        });
      } else {
        Modal.show('Modal', {
          title: __('schemaStatementEntries.original.label'),
          body: 'Doc_view',
          bodyContext: { doc: doc.original },
        });
      }
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('statements.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.edit',
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
    icon: 'fa fa-external-link',
    color: 'danger',
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    subActions: !doc.txdef && Txdefs.find({ communityId: doc.communityId }).fetch().filter(td => td.isReconciledTx())
      .map(txdef => StatementEntries.actions.matchedReconcile({ txdef }, doc, user)),
  }),
  matchedReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'matchedReconcile',
    label: options.txdef?.name || __('reconcile'),
    icon: 'fa fa-external-link',
    color: doc.match?.confidence,
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc) && (options.txdef || doc.match?.tx?.defId),
    run() {
      ModalStack.setVar('statementEntry', doc);
      let txdef, newTx;
      if (options.txdef) {
        txdef = options.txdef;
        newTx = {
          communityId: doc.communityId,
          valueDate: doc.valueDate,
          title: doc.note,
        };
        Transactions.setTxdef(newTx, txdef);
      } else {
        debugAssert(doc.match.tx);
        txdef = Txdefs.findOne(doc.match.tx.defId);
        newTx = doc.match.tx;
      }
      ModalStack.setVar('newDoc', newTx);

      if (doc.community().settings.paymentsWoStatement) {
        const reconciliationDoc = { _id: doc._id, defId: newTx.defId, txId: doc.match?.txId };
        Modal.show('Autoform_modal', {
          body: 'Reconciliation',
          bodyContext: { doc: reconciliationDoc },
          // --- --- --- ---
          id: 'af.statementEntry.reconcile',
          schema: reconciliationSchema,
          doc: reconciliationDoc,
          type: 'method',
          meteormethod: 'statementEntries.reconcile',
          // --- --- --- ---
          size: 'lg',
        });
      } else {
        Transactions.actions.new({ txdef }, newTx).run();
        ModalStack.autorun((computation) => {
          const result = ModalStack.readResult('root', `af.${txdef.category}.create`, true);
          if (result) {
            Meteor.defer(() => {
              computation.stop();
              StatementEntries.methods.reconcile.call({ _id: doc._id, txId: result },
                (err) => {
                  if (err && result) {
                    Transactions.methods.remove.call({ _id: result });
                    displayError(err);
                    displayMessage('success', __(txdef.category) + ' ' + __('actionDone_remove'));
                  }
                });
            });
          }
        });
      }
    },
  }),
  unReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'unReconcile',
    icon: 'fa fa-times',
    visible: doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    run() {
      if (doc.community().settings.paymentsWoStatement) {
        StatementEntries.methods.unReconcile.call({ _id: doc._id });
      } else {
        Transactions.actions.delete({}, doc.transaction()).run();
      }
    },
  }),
  autoReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'autoReconcile',
    icon: 'fa fa-external-link',
    color: 'primary',
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.autoReconcile.call({ _id: doc._id });
    },
  }),
  recognize: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'recognize',
    icon: 'fa fa-question',
    visible: user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.recognize.call({ _id: doc._id });
    },
  }),
  transaction: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'transaction',
    icon: 'fa fa-link',
    visible: doc.isReconciled() && user.hasPermission('transactions.inCommunity', doc),
    run() {
      Transactions.actions.view(options, doc.transaction()).run();
    },
  }),
  post: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'post',
    icon: 'fa fa-check-square-o',
    color: 'warning',
    visible: doc.transaction() && !(doc.transaction().isPosted()) && user.hasPermission('transactions.post', doc),
    run() {
      Transactions.actions.post(options, doc.transaction()).run();
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
  transaction() { return { isPosted() { return false; } }; },
  match: {},
};

StatementEntries.batchActions = {
  recognize: new BatchAction(StatementEntries.actions.recognize, StatementEntries.methods.batch.recognize, {}, StatementEntries.dummyDoc),
  autoReconcile: new BatchAction(StatementEntries.actions.autoReconcile, StatementEntries.methods.batch.autoReconcile, {}, StatementEntries.dummyDoc),
  post: new BatchAction(StatementEntries.actions.post, Transactions.methods.batch.post, {}, StatementEntries.dummyDoc, doc => { doc._id = doc.txId; }),
  delete: new BatchAction(StatementEntries.actions.delete, StatementEntries.methods.batch.remove),
};

//--------------------------------------------------------

AutoForm.addModalHooks('af.statementEntry.create');
AutoForm.addModalHooks('af.statementEntry.edit');
AutoForm.addModalHooks('af.statementEntry.reconcile');

AutoForm.addHooks('af.statementEntry.create', {
  docToForm(doc) {
//    doc.account = ModalStack.getVar('account');
    return doc;
  },
});

AutoForm.addHooks(['af.statementEntry.view', 'af.statementEntry.create', 'af.statementEntry.edit'], {
  formToDoc(doc) {
    if (doc.original) doc.original = JSON.parse(doc.original);
    if (doc.match) doc.match = JSON.parse(doc.match);
    return doc;
  },
  docToForm(doc) {
    if (doc.original) doc.original = JSON.stringify(doc.original || {}, null, 2);
    if (doc.match) doc.match = JSON.stringify(doc.match || {}, null, 2);
    return doc;
  },
  formToModifier(modifier) {
    if (modifier.$set.original) modifier.$set.original = JSON.parse(modifier.$set.original);
    if (modifier.$set.match) modifier.$set.match = JSON.parse(modifier.$set.match);
    return modifier;
  },
});

AutoForm.addHooks('af.statementEntry.reconcile', {
  formToDoc(doc) {
    doc._id = ModalStack.getVar('statementEntry')._id;
    return doc;
  },
});
