/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Statements } from '/imports/api/transactions/statements/statements.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { statementEntriesColumns } from '/imports/api/transactions/statement-entries/tables.js';
import { allStatementEntriesActions } from '/imports/api/transactions/statement-entries/actions.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import './accounting-reconciliation.html';

Template.Accounting_reconciliation.viewmodel({
  unreconciledOnly: true,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('statements.inCommunity', { communityId });
      if (this.unreconciledOnly()) {
        instance.subscribe('statementEntries.unreconciled', { communityId });
      } else {
        instance.subscribe('statementEntries.byAccount', { communityId });
      }
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
/*  transactionsIncompleteTableDataFn() {
    const self = this;
    const templateInstance = Template.instance();
    return () => {
      if (!templateInstance.subscriptionsReady()) return [];
      return Transactions.find({ communityId: self.communityId(), complete: false }).fetch();
    };
  },
  transactionsOptionsFn() {
    return () => Object.create({
      columns: transactionColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      ...DatatablesExportButtons,
    });
  },*/
  filterSelector() {
    const selector = { communityId: this.communityId() };
    if (this.unreconciledOnly()) selector.reconciledId = { $exists: false };
    return selector;
  },
  statementEntriesTableDataFn() {
    const self = this;
    const templateInstance = Template.instance();
    return () => {
      if (!templateInstance.subscriptionsReady()) return [];
      const entries = StatementEntries.find(self.filterSelector()).fetch();
      return entries;
    };
  },
  statementEntriesOptionsFn() {
    return () => Object.create({
      columns: statementEntriesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      ...DatatablesExportButtons,
    });
  },
});

Template.Accounting_reconciliation.events({
  'click .js-new-statement'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.statementEntry.insert',
      collection: StatementEntries,
      type: 'method',
      meteormethod: 'statementEntries.insert',
    });
  },
  ...(actionHandlers(StatementEntries)),
});
