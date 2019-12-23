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
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/balances/methods.js';
import { TxDefs } from '/imports/api/transactions/tx-defs/tx-defs.js';
import '/imports/api/transactions/tx-defs/methods.js';
import { transactionColumns } from '/imports/api/transactions/tables.js';
import '/imports/api/transactions/actions.js';
import '/imports/api/transactions/categories';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-transactions.html';

Template.Accounting_transactions.viewmodel({
  txDefSelected: '',
  txDefOptions: [],
  creditAccountSelected: '',
  creditAccountOptions: [],
  debitAccountSelected: '',
  debitAccountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
//  partnerSelected: '',
//  referenceIdSelected: '',
  beginDate: '',
  endDate: '',
//  amount: undefined,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('txDefs.inCommunity', { communityId });
      instance.subscribe('transactions.incomplete', { communityId });
      instance.subscribe('bills.outstanding', { communityId });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  autorun: [
    function setTxDefOptions() {
      const communityId = Session.get('activeCommunityId');
      this.txDefOptions(TxDefs.find({ communityId }).map(function (cat) {
        return { value: cat._id, label: __(cat.name) };
      }));
      if (!this.txDefSelected() && this.txDefOptions() && this.txDefOptions().length > 0) {
        this.txDefSelected(this.txDefOptions()[0].value);
      }
    },
    function setFilterAccountOptions() {
      const txDef = TxDefs.findOne(this.txDefSelected());
      const coa = ChartOfAccounts.get();
      const loc = Localizer.get();
      if (!txDef || !coa || !loc) return;
      this.creditAccountOptions(coa.nodeOptionsOf(txDef.credit));
      this.debitAccountOptions(coa.nodeOptionsOf(txDef.debit));
      this.creditAccountSelected(txDef.credit[0] || '');
      this.debitAccountSelected(txDef.debit[0] || '');
      this.localizerOptions(loc.nodeOptions());
    },
    function txSubscription() {
      this.templateInstance.subscribe('transactions.betweenAccounts', this.subscribeParams());
    },
  ],
  txDefs() {
    const communityId = Session.get('activeCommunityId');
    const txDefs = TxDefs.find({ communityId }).fetch().filter(c => c.isAccountantTx());
    return txDefs;
  },
  optionsOf(accountCode) {
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', this.communityId());
    if (brk) return brk.nodeOptionsOf(accountCode, true);
    return [];
  },
  subscribeParams() {
    return {
      communityId: this.communityId(),
      defId: this.txDefSelected(),
      creditAccount: '\\^' + this.creditAccountSelected() + '\\',
      debitAccount: '\\^' + this.debitAccountSelected() + '\\',
      begin: new Date(this.beginDate()),
      end: new Date(this.endDate()),
    };
  },
  transactionsTableDataFn() {
    const templateInstance = Template.instance();
    return () => {
      if (!templateInstance.subscriptionsReady()) return [];
      const selector = Transactions.makeFilterSelector(this.subscribeParams());
      return Transactions.find(selector).fetch();
    };
  },
  transactionsOptionsFn() {
    return () => Object.create({
      columns: transactionColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      ...DatatablesExportButtons,
    });
  },
});

Template.Accounting_transactions.events(
  actionHandlers(Transactions),
);
