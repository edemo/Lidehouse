import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';
import './methods.js';

StatementEntries.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('statements.insert', doc),
    run(options, doc, event, instance) {
//      Session.update('modalContext', 'account', instance.viewmodel.accountSelected());
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.insert',
        collection: StatementEntries,
        omitFields: ['original', 'match'],
        doc: {
          account: instance.viewmodel.accountSelected(),
          valueDate: new Date(),
        },
        type: 'method',
        meteormethod: 'statementEntries.insert',
      });
    },
  },
  import: {
    name: 'import',
    icon: () => 'fa fa-upload',
    visible: (options, doc) => currentUserHasPermission('statements.upsert', doc),
    run: () => {
      importCollectionFromFile(StatementEntries, { keepOriginals: true });
      StatementEntries.methods.autoReconciliation.call({ communityId: getActiveCommunityId() });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('statements.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.view',
        collection: StatementEntries,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('statements.update', doc),
    run(options, doc) {
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
  },
  reconcile: {
    name: 'reconcile',
    label(options) {
      if (options.txdef) return options.txdef.name;
      return __('reconcile');
    },
    icon: () => 'fa fa-external-link',
    color(options, doc) {
      if (doc.match) return 'info';
      else return 'danger';
    },
    visible(options, doc) {
      if (!doc || doc.isReconciled()) return false;
      return currentUserHasPermission('statements.reconcile', doc);
    },
    subActions: () => true,
    subActionsOptions(options, doc) {
      const txdefs = Txdefs.find({ communityId: doc.communityId }).fetch().filter(td => td.isReconciledTx());
      return txdefs.map(txdef => ({ txdef }));
    },
    run(options, doc) {
      const insertTx = {
        amount: Math.abs(doc.amount),  // payment
        lines: [{ quantity: 1, unitPrice: Math.abs(doc.amount) }],  // receipt
        partnerName: doc.name, // receipt
        valueDate: doc.valueDate,
        payAccount: doc.account,  // receipt, payment
        fromAccount: doc.account,  // transfer
        toAccount: doc.account,  // transfer
      };
      Session.update('modalContext', 'txdef', options.txdef);
      Session.update('modalContext', 'statementEntry', doc);
      Session.update('modalContext', 'insertTx', insertTx);
      Modal.show('Autoform_modal', {
        title: `${__('Reconciliation')} >> ${__(options.txdef.name)}`,
        id: 'af.statementEntry.reconcile',
        schema: StatementEntries.reconcileSchema,
        type: 'method',
        meteormethod: 'statementEntries.reconcile',
      });
    },
  },
  autoReconcile: {
    name: 'autoReconcile',
    icon: () => 'fa fa-external-link',
    color: () => 'info',
    visible(options, doc) {
      if (!doc || doc.isReconciled()) return false;
      return currentUserHasPermission('statements.reconcile', doc);
    },
    run(options, doc) {
      StatementEntries.methods.reconcile.call({ _id: doc._id });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('transactions.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(StatementEntries.methods.remove, { _id: doc._id }, {
        action: 'delete statementEntry',
      });
    },
  },
};

StatementEntries.batchActions = {
  autoReconcile: new BatchAction(StatementEntries.actions.autoReconcile, StatementEntries.methods.batch.reconcile),
  delete: new BatchAction(StatementEntries.actions.delete, StatementEntries.methods.batch.remove),
};

//--------------------------------------------------------

AutoForm.addModalHooks('af.statementEntry.insert');
AutoForm.addModalHooks('af.statementEntry.update');
AutoForm.addModalHooks('af.statementEntry.reconcile');

AutoForm.addHooks('af.statementEntry.insert', {
  docToForm(doc) {
//    doc.account = Session.get('modalContext').account;
    return doc;
  },
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
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
    doc._id = Session.get('modalContext').statementEntry._id;
    return doc;
  },
});
