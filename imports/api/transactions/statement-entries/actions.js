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
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
import { reconciliationSchema } from '/imports/api/transactions/reconciliation/reconciliation.js';
import '/imports/ui_3/views/components/reconciliation.js';
import '/imports/ui_3/views/components/doc-view.js';
import './methods.js';
import { Transactions } from '../transactions.js';

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
    label: options.txdef?.name || __('reconcile'),
    icon: 'fa fa-external-link',
    color: doc.match?.confidence,
    visible: !doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    subActions: (doc.match?.confidence === 'danger') && !options.txdef
      && Txdefs.find({ communityId: doc.communityId }).fetch().filter(td => td.isReconciledTx())
      .map(txdef => StatementEntries.actions.reconcile({ txdef }, doc, user)),
    run() {
//      ModalStack.setVar('txdef', options.txdef);
      ModalStack.setVar('statementEntry', doc);
/*      const tx = {
        communityId: doc.communityId,
        defId: options.txdef._id,
        category: options.txdef.category,
        relation: options.txdef.data.relation,
        amount: doc.amount,
        valueDate: doc.valueDate,
      };*/
      const reconciliationDoc = { _id: doc._id, defId: doc.match?.tx?.defId || options.txdef._id, txId: doc.match?.txId };
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
    },
  }),
  unReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'unReconcile',
    icon: 'fa fa-times',
    visible: doc.isReconciled() && user.hasPermission('statements.reconcile', doc),
    run() {
      StatementEntries.methods.unReconcile.call({ _id: doc._id });
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
    visible: !doc.isReconciled() && !doc.match?.status && user.hasPermission('statements.reconcile', doc),
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
