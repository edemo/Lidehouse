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

import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Statements } from '/imports/api/transactions/statements/statements.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { statementEntriesColumns } from '/imports/api/transactions/statement-entries/tables.js';
import { allStatementEntriesActions } from '/imports/api/transactions/statement-entries/actions.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-reconciliation.html';

Template.Accounting_reconciliation.viewmodel({
  beginDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  status: 'Reconciled',
  unreconciledOnly: true,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = getActiveCommunityId();
      instance.subscribe('statements.inCommunity', { communityId });
      if (this.unreconciledOnly()) {
        instance.subscribe('statementEntries.unreconciled', { communityId });
      } else {
        instance.subscribe('statementEntries.byAccount', { communityId });
      }
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const coa = ChartOfAccounts.get();
      if (coa) this.accountOptions(coa.nodeOptionsOf('38', true));
      if (this.accountOptions().length && !this.accountSelected()) {
        this.accountSelected(this.accountOptions()[1].value);
      }
    },
  ],
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
    const selector = { 
      communityId: getActiveCommunityId(),
      account: this.accountSelected(),
//      valueDate: { $gte: this.beginDate(), $lte: this.endDate() },
    };
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
      ...DatatablesSelectButtons(StatementEntries),
    });
  },
});

Template.Accounting_reconciliation.events({
  ...(actionHandlers(StatementEntries)),
});
