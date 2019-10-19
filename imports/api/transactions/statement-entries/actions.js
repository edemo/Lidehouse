import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { StatementEntries } from './statement-entries.js';
import './methods.js';
import { Bills } from './bills/bills.js';

export function allStatementEntriesActions() {
  StatementEntries.actions = StatementEntries.actions || {
    collection: StatementEntries,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      visible: () => currentUserHasPermission('statements.insert'),
      run(defId) {
        Modal.show('Autoform_edit', {
          id: 'af.statementEntries.insert',
          collection: StatementEntries,
          type: 'method',
          meteormethod: 'statementEntries.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      visible: () => currentUserHasPermission('statements.inCommunity'),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.transaction.view',
          collection: StatementEntries,
          doc: StatementEntries.findOne(id),
          type: 'readonly',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      visible: () => currentUserHasPermission('statements.update'),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.statement.update',
          collection: StatementEntries,
          doc: StatementEntries.findOne(id),
          type: 'method-update',
          meteormethod: 'statements.update',
          singleMethodArgument: true,
        });
      },
    },
    reconcile: {
      name: 'reconcile',
      icon: 'fa fa-external-link',
      visible: () => currentUserHasPermission('statements.reconcile'),
      run(id) {
        Session.set('activePaymentId', id);
        Modal.show('Autoform_edit', {
          id: 'af.statement.reconcile',
          schema: Bills.reconcileSchema(),
          type: 'method',
          meteormethod: 'statementEntries.reconcile',
        });
      },
    },
  };
  return StatementEntries.actions;
}

export function getStatementEntriesActionsSmall() {
  allStatementEntriesActions();
  const actions = [
    StatementEntries.actions.view,
    StatementEntries.actions.edit,
    StatementEntries.actions.reconcile,
    StatementEntries.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.statementEntry.insert');
AutoForm.addModalHooks('af.statementEntry.update');
AutoForm.addModalHooks('af.statementEntry.reconcile');

AutoForm.addHooks('af.statementEntry.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addHooks('af.statementEntry.reconcile', {
  formToDoc(doc) {
    doc.reconciledId = Session.get('activeBillId');
    return doc;
  },
});
