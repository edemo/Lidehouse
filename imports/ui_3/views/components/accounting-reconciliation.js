/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { dateSelector } from '/imports/api/utils.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Statements } from '/imports/api/accounting/statements/statements.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { statementEntriesWithJournalEntriesColumns  } from '/imports/api/accounting/statement-entries/tables.js';
import { allStatementEntriesActions } from '/imports/api/accounting/statement-entries/actions.js';
import { Recognitions } from '/imports/api/accounting/reconciliation/recognitions.js';
import '/imports/api/accounting/reconciliation/actions.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/components/accounting-filter.js';
import './accounting-reconciliation.html';

Template.Accounting_reconciliation.viewmodel({
  share: 'accountingFilter',
  accountSelected: '',
  accountOptions: [],
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = getActiveCommunityId();
      instance.subscribe('recognitions.ofCommunity', { communityId });
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const communityId = getActiveCommunityId();
//      const moneyAccount = Accounts.findOneT({ communityId, name: 'Money accounts' });
//      if (!moneyAccount) return;
//      this.accountOptions(moneyAccount.nodeOptions(true));
      const nodeOptions = Accounts.nodeOptionsOf(communityId, ['`38', '`43'], /*leafsOnly*/ true, /*addRootNode*/ false);
      this.accountOptions(nodeOptions);
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
  communityId() {
    return getActiveCommunityId();
  },
  communityIdObject() {
    return { communityId: this.communityId() };
  },
  statementEntriesFilterSelector() {
    const selector = {
      communityId: getActiveCommunityId(),
      account: this.accountSelected(),
    };
    const valueDate = dateSelector(this.beginDate(), this.endDate());
    if (valueDate) selector.valueDate = valueDate;
    if (this.unreconciledOnly()) selector.reconciled = false;
    return selector;
  },
  statementEntriesTableDataFn() {
    const self = this;
    const instance = this.templateInstance;
    return () => {
      if (!instance.subscriptionsReady()) return [];
      const selector = self.statementEntriesFilterSelector();
      const entries = StatementEntries.find(selector).fetch();
      return entries;
    };
  },
  statementEntriesOptionsFn() {
    return () => Object.create({
      columns: statementEntriesWithJournalEntriesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      ...DatatablesExportButtons,
      ...DatatablesSelectButtons(StatementEntries),
    });
  },
});

Template.Accounting_reconciliation.events({
  'click .recognition .js-edit'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    const recognition = Recognitions.findOne({ communityId });
    Recognitions.actions.edit({}, recognition).run(event, instance);
  },
  ...(actionHandlers(StatementEntries, 'create,import')),
});
