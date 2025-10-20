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
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/accounting/methods.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import '/imports/api/accounting/balances/methods.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import '/imports/api/accounting/txdefs/methods.js';
import { transactionColumns } from '/imports/api/accounting/tables.js';
import '/imports/api/accounting/actions.js';
import '/imports/api/accounting/categories';
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
  },
  accountSelected(side) {
    if (side === 'debit') return this.debitAccountSelected();
    else if (side === 'credit') return this.creditAccountSelected();
    else return undefined;
  },
  autorun: [
    function setTxdefOptions() {
      const communityId = this.communityId();
      const txdefOptions = [{ value: '', label: __('All') }];
      Txdefs.findTfetch({ communityId }).map(function (def) {
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
      const debitAccountOptions = txdef ? Accounts.nodeOptionsOf(communityId, txdef.debit) : coa.nodeOptions(communityId);
      this.debitAccountOptions(debitAccountOptions);
      const creaditAccountOptions = txdef ? Accounts.nodeOptionsOf(communityId, txdef.credit) : coa.nodeOptions(communityId);
      this.creditAccountOptions(creaditAccountOptions);
      this.debitAccountSelected('`');
      this.creditAccountSelected('`');
    },
  ],
  txdefs() {
    const communityId = ModalStack.getVar('communityId');
    const txdefs = Txdefs.findTfetch({ communityId }, { sort: { createdAt: 1 } }).filter(c => c.isAccountantTx());
    return txdefs;
  },
  optionsOf(accountCode) {
    return Accounts.nodeOptionsOf(this.communityId(), accountCode, true);
  },
  transactionsFilterSelector() {
    const selector = this.filterSelector();
    delete selector.relation; // relation has only effect on the bills page
    const defId = this.txdefSelected();
    let txdef;
    if (defId) {
      selector.defId = defId;
      txdef = Txdefs.findOne(defId);
    }
    ['debit', 'credit'].forEach(side => {
      let accountSelected = this.accountSelected(side);
      const userSelectedAnAccount = accountSelected?.length > 1;
      if (userSelectedAnAccount && txdef?.category === 'bill' && this.community().settings.accountingMethod === 'cash' && side === txdef.conteerSide()) {
        accountSelected = Accounts.toTechnicalCode(accountSelected);
      }
      if (userSelectedAnAccount || !_.contains(this.txStatusSelected(), 'draft')) {
        selector[`${side}Account`] = accountSelected;
      }
    });
    return Transactions.makeFilterSelector(selector);
  },
  transactionsTableDataFn() {
    const instance = this.templateInstance;
    return () => {
      if (!instance.subscriptionsReady()) return [];
      const selector = this.transactionsFilterSelector();
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
  actionHandlers(Transactions, 'create'),
);
