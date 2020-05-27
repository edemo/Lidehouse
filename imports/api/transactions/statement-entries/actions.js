import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { importCollectionFromFile } from '/imports/data-import/import.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
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
      importCollectionFromFile(StatementEntries, { keepOriginals: true, communityId: getActiveCommunityId(), account: instance.viewmodel.accountSelected() });
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
      Modal.show('Autoform_modal', {
        title: `${__('Reconciliation')} >> ${__(options.txdef.name)}`,
        id: 'af.statementEntry.reconcile',
        schema: StatementEntries.reconcileSchema,
        type: 'method',
        meteormethod: 'statementEntries.reconcile',
      });
    },
  }),
  autoReconcile: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'autoReconcile',
    icon: 'fa fa-external-link',
    color: 'info',
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
  communityId: getActiveCommunityId(),
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
