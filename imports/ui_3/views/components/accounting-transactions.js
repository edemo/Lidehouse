/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

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
  txdefSelected: '',
  txdefOptions: [],
  debitAccountSelected: '',
  debitAccountOptions: [],
  creditAccountSelected: '',
  creditAccountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
//  partnerSelected: '',
//  referenceIdSelected: '',
  beginDate: moment().subtract('30', 'day').format('YYYY-MM-DD'),
  endDate: moment().format('YYYY-MM-DD'),
//  amount: undefined,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('txdefs.inCommunity', { communityId });
      instance.subscribe('transactions.incomplete', { communityId });
      instance.subscribe('bills.outstanding', { communityId });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  autorun: [
    function setTxdefOptions() {
      const communityId = Session.get('activeCommunityId');
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
      const coa = ChartOfAccounts.get();
      if (coa) {
        const txdef = Txdefs.findOne(this.txdefSelected());
        const debitAccountOptions = txdef ? [{ label: __('Chart Of Accounts'), value: '' }].concat(coa.nodeOptionsOf(txdef.debit)) : coa.nodeOptions();
        this.debitAccountOptions(debitAccountOptions);
        const creaditAccountOptions = txdef ? [{ label: __('Chart Of Accounts'), value: '' }].concat(coa.nodeOptionsOf(txdef.credit)) : coa.nodeOptions();
        this.creditAccountOptions(creaditAccountOptions);
        if (!this.debitAccountSelected() && this.debitAccountOptions() && this.debitAccountOptions().length > 0) {
          this.debitAccountSelected(this.debitAccountOptions()[0].value);
        }
        if (!this.creditAccountSelected() && this.creditAccountOptions() && this.creditAccountOptions().length > 0) {
          this.creditAccountSelected(this.creditAccountOptions()[0].value);
        }
      }
      const loc = Localizer.get();
      if (loc) {
        this.localizerOptions(loc.nodeOptions());
      }
    },
    function txSubscription() {
      this.templateInstance.subscribe('transactions.betweenAccounts', this.subscribeParams());
    },
  ],
  txdefs() {
    const communityId = Session.get('activeCommunityId');
    const txdefs = Txdefs.find({ communityId }).fetch().filter(c => c.isAccountantTx());
    return txdefs;
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
      defId: this.txdefSelected(),
      debitAccount: '\\^' + this.debitAccountSelected() + '\\',
      creditAccount: '\\^' + this.creditAccountSelected() + '\\',
      localizer: this.localizerSelected(),
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
