import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { Session } from 'meteor/session';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { displayError, handleError } from '/imports/ui_3/lib/errors.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { Relations } from '/imports/api/core/relations.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
import { reconciliationSchema } from '/imports/api/accounting/reconciliation/reconciliation.js';
import { reconcileSeHandlingErr } from '/imports/ui_3/views/components/reconciliation.js';
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
      const account = Accounts.findOneT({ communityId: getActiveCommunityId(), code: accountCode });
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
          id: 'statementEntry.view',
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
    subActions: !doc.txdef && Txdefs.findTfetch({ communityId: doc.communityId }).filter(td => td.isReconciledTo(doc.account))
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
      if (options.txdef) {  // when we come from the reconcile method and selected a txdef
        txdef = options.txdef;
        newTx = {
          communityId: doc.communityId,
          valueDate: doc.valueDate,
          title: doc.note,
        };
        Transactions.setTxdef(newTx, txdef);
      } else {            // when we come from the suggested match reconciliation
        debugAssert(doc.match.tx);
        txdef = Txdefs.findOne(doc.match.tx.defId);
        newTx = doc.match.tx;
      }
      ModalStack.setVar('newDoc', newTx);

      // if (doc.community().settings.paymentsWoStatement || txdef.category === 'transfer') {
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
/*       } else {
        Transactions.actions.create({ txdef }, newTx).run();
        ModalStack.autorun((computation) => {
          const result = ModalStack.readResult('root', `af.${txdef.category}.create`, true);
          if (result) {
            Meteor.defer(() => {
              computation.stop();
              reconcileSeHandlingErr(doc._id, result, txdef.category);
            });
          }
        });
      } */
    },
  }),
  unReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'unReconcile',
    label: 'unReconcile',
    icon: 'fa fa-times',
    visible: doc.hasReconciledTx() && user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.unReconcile.call({ _id: doc._id });
    },
  }),
  autoReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'autoReconcile',
    icon: 'fa fa-link',
    color: doc.match?.confidence,
    visible: !doc.hasReconciledTx() && _.contains(['primary', 'success', 'info'], doc.match?.confidence) && user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.autoReconcile.call({ _id: doc._id }, handleError);
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
/*  transaction: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'transaction',
    label: 'view transaction',
    icon: 'fa fa-eye',
    visible: doc.transaction()?._id && user.hasPermission('transactions.inCommunity', doc),
    run() {
      Transactions.actions.view(options, doc.transaction()).run();
    },
  }),*/
  post: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'post',
    icon: 'fa fa-check-square-o',
    color: 'warning',
    visible: doc.isReconciled() && _.any(doc.reconciledTransactions(), tx => !tx?.isPosted()) && user.hasPermission('transactions.post', doc),
    run() {
      doc.reconciledTransactions()?.forEach(tx => {
        if (!tx?.isPosted()) Transactions.actions.post(options, tx).run();
      });
    },
  }),
  viewTransactions: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'viewTransactions',
    label: 'view',
    icon: 'fa fa-eye',
    visible: doc.hasReconciledTx() && user.hasPermission('statements.reconcile', doc),
    run() {
      doc.reconciledTransactions()?.forEach(tx => {
        Transactions.actions.view({}, tx).run();
      });
    },
  }),
  deleteTransactions: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'deleteTransactions',
    label: 'delete',
    icon: 'fa fa-trash',
    visible: doc.hasReconciledTx() && user.hasPermission('statements.reconcile', doc),
    run() {
      doc.reconciledTransactions()?.forEach(tx => {
        Transactions.actions.delete({}, tx).run();
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('transactions.remove', doc),
    run() {
      Modal.confirmAndCall(StatementEntries.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'statementEntry',
      });
    },
  }),
};

StatementEntries.dummyDoc = {
  communityId: getActiveCommunityId,
  isReconciled() { return false; },
  hasReconciledTx() { return false; },
  reconciledTransactions() { return [{ isPosted() { return false; } }]; },
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
    const entry = ModalStack.getVar('statementEntry');
    doc._id = entry._id;
    return doc;
  },
  before: {
    'method'(doc) {
      const entry = ModalStack.getVar('statementEntry');
      const tx = doc.txId && Transactions.findOne(doc.txId);
      if (!entry.txId?.length && tx && _.contains(['payment', 'receipt'], tx.category) && entry.amount !== tx.amount * tx.relationSign()) {
        Modal.confirmAndCall(StatementEntries.methods.reconcile, doc, {
          action: 'reconcile',
          entity: 'statementEntry',
          message: 'The transaction amount does not match the entry amount',
        }, (res) => { if (res) {
          Session.set('reconciledFromList', true);
          Modal.hide(this.template.parent());
        }
        });
        return false;
      }
      return doc;
    },
  },
  onSuccess(formType, result) {
    Session.set('reconciledFromList', true);
  },
});
