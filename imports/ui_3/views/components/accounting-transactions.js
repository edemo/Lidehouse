/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/balances/methods.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import '/imports/api/transactions/txdefs/methods.js';
import { transactionColumns } from '/imports/api/transactions/tables.js';
import '/imports/api/transactions/actions.js';
import '/imports/api/transactions/categories';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-transactions.html';

Template.Accounting_transactions.viewmodel({
  share: 'accountingFilter',
  txdefSelected: '',
  txdefOptions: [],
  debitAccountSelected: '',
  debitAccountOptions: [],
  creditAccountSelected: '',
  creditAccountOptions: [],
//  amount: undefined,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('txdefs.inCommunity', { communityId });
    });
  },
  communityId() {
    return ModalStack.getVar('communityId');
  },
  autorun: [
    function setTxdefOptions() {
      const communityId = this.communityId();
      const txdefOptions = [{ value: '', label: __('All') }];
      Txdefs.find({ communityId }).map(function (def) {
        txdefOptions.push({ value: def._id, label: __(def.name) });
      });
      this.txdefOptions(txdefOptions);
      if (!this.txdefSelected() && this.txdefOptions() && this.txdefOptions().length > 0) {
        this.txdefSelected(this.txdefOptions()[0].value);
      }
    },
    function setFilterAccountOptions() {
      const communityId = this.communityId(); if (!communityId) return;
      const coa = Accounts.coa(communityId); if (!coa) return;
      const txdef = Txdefs.findOne(this.txdefSelected());
      const debitAccountOptions = txdef ? Accounts.nodeOptionsOf(communityId, txdef.debit) : coa.nodeOptions();
      this.debitAccountOptions(debitAccountOptions);
      const creaditAccountOptions = txdef ? Accounts.nodeOptionsOf(communityId, txdef.credit) : coa.nodeOptions();
      this.creditAccountOptions(creaditAccountOptions);
      if (!this.debitAccountSelected() && this.debitAccountOptions() && this.debitAccountOptions().length > 0) {
        this.debitAccountSelected(this.debitAccountOptions()[0].value);
      }
      if (!this.creditAccountSelected() && this.creditAccountOptions() && this.creditAccountOptions().length > 0) {
        this.creditAccountSelected(this.creditAccountOptions()[0].value);
      }
    },
    function txSubscription() {
      this.templateInstance.subscribe('transactions.betweenAccounts', this.subscribeParams());
    },
  ],
  txdefs() {
    const communityId = ModalStack.getVar('communityId');
    const txdefs = Txdefs.find({ communityId }).fetch().filter(c => c.isAccountantTx());
    return txdefs;
  },
  optionsOf(accountCode) {
    return Accounts.nodeOptionsOf(this.communityId(), accountCode, true);
  },
  subscribeParams() {
    const selector = _.extend({
      defId: this.txdefSelected(),
      debitAccount: '\\^' + this.debitAccountSelected() + '\\',
      creditAccount: '\\^' + this.creditAccountSelected() + '\\',
    }, this.txSubscribeSelector());
    return selector;
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
      ...DatatablesSelectButtons(Transactions),
    });
  },
});

Template.Accounting_transactions.events(
  actionHandlers(Transactions, 'new'),
);
