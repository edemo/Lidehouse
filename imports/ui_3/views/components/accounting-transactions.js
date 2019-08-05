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
import { transactionColumns } from '/imports/api/transactions/tables.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/balances/methods.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import '/imports/api/transactions/txdefs/methods.js';
import { matchBillSchema } from '/imports/api/transactions/bills/bills.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
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
      instance.subscribe('txdefs.inCommunity', { communityId });
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
      this.txDefOptions(TxDefs.find({ communityId }).map(function (t) {
        return { value: t.name, label: __(t.name) };
      }));
      if (!this.txDefSelected() && this.txDefOptions() && this.txDefOptions().length > 0) {
        this.txDefSelected(this.txDefOptions()[0].value);
      }
    },
    function setFilterAccountOptions() {
      const coa = ChartOfAccounts.get();
      const loc = Localizer.get();
      if (coa && loc) {
        this.creditAccountOptions(coa.nodeOptions());
        this.debitAccountOptions(coa.nodeOptions());
        this.localizerOptions(loc.nodeOptions());
      }
    },
    function autoSelectFilterAccounts() {
      const txDef = TxDefs.findOne({ name: this.txDefSelected() });
      if (!txDef) return;
      this.creditAccountSelected(txDef.credit);
      this.debitAccountSelected(txDef.debit);
    },
    function txSubscription() {
      const communityId = Session.get('activeCommunityId');
      this.templateInstance.subscribe('transactions.betweenAccounts', { communityId,
        creditAccount: this.creditAccountSelected(),
        debitAccount: this.debitAccountSelected(),
        begin: new Date(this.beginDate()),
        end: new Date(this.endDate()),
      });
    },
  ],
  txDefs() {
    const communityId = Session.get('activeCommunityId');
    const txdefs = TxDefs.find({ communityId });
    return txdefs;
  },
  optionsOf(accountCode) {
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', this.communityId());
    if (brk) return brk.nodeOptionsOf(accountCode, true);
    return [];
  },
  transactionsIncompleteTableDataFn() {
    const self = this;
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      return Transactions.find({ communityId: self.communityId(), complete: false }).fetch();
    }
    return getTableData;
  },
  transactionsTableDataFn() {
    const self = this;
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      return Transactions.find({ communityId: self.communityId(), complete: true }).fetch();
      // Filtered selector would be needed - but client side selector is slow, and we need everything anyways
    }
    return getTableData;
  },
  transactionsOptionsFn() {
    const self = this;
    function getOptions() {
      return {
        columns: transactionColumns({
          view: Meteor.user().hasPermission('transactions.inCommunity', self.communityId()),
          edit: Meteor.user().hasPermission('transactions.update', self.communityId()),
          link: Meteor.user().hasPermission('transactions.reconcile', self.communityId()),
          delete: Meteor.user().hasPermission('transactions.remove', self.communityId()),
        }),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        ...DatatablesExportButtons,
      };
    }
    return getOptions;
  },
  afCommunityFinancesData() {
    const communityId = Session.get('activeCommunityId');
    const financesOnlySchema = Communities.simpleSchema().pick(['finances', 'finances.ccArea', 'finances.ccVolume', 'finances.ccHabitants']);
    return {
      id: 'af.communities.finances',
      collection: Communities,
      schema: financesOnlySchema,
      doc: Communities.findOne(communityId),
      type: 'method-update',
      meteormethod: 'communities.update',
      singleMethodArgument: true,
    };
  },
});

Template.Accounting_transactions.events({
  'click .transactions .js-new'(event, instance) {
    const defId = $(event.target).data("id");
    Session.set('activeTxDef', defId);
    const def = TxDefs.findOne({ name: defId });
    Modal.show('Autoform_edit', {
      id: 'af.transaction.insert',
      collection: Transactions,
      schema: def.schema(),
//      type: 'method',
//      meteormethod: 'transactions.insert',
    });
  },
  'click .transactions .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.transaction.update',
      collection: Transactions,
//      schema: newTransactionSchema(),
      doc: Transactions.findOne(id),
      type: 'method-update',
      meteormethod: 'transactions.update',
      singleMethodArgument: true,
    });
  },
  'click .transactions .js-link'(event) {
    const id = $(event.target).closest('button').data('id');
    Session.set('activeTransactionId', id);
    Modal.show('Autoform_edit', {
      id: 'af.transaction.reconcile',
      schema: matchBillSchema(),
    });
  },
  'click .transactions .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.transaction.view',
      collection: Transactions,
      schema: Transactions.inputSchema,
      doc: Transactions.findOne(id),
      type: 'readonly',
    });
  },
  'click .transactions .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    const tx = Transactions.findOne(id);
    Modal.confirmAndCall(Transactions.methods.remove, { _id: id }, {
      action: 'delete transaction',
      message: tx.isSolidified() ? 'Remove not possible after 24 hours' : '',
    });
  },
});

AutoForm.addModalHooks('af.transaction.insert');
AutoForm.addModalHooks('af.transaction.update');
AutoForm.addHooks('af.transaction.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.transaction.insert');
    const defId = Session.get('activeTxDef');
    const def = TxDefs.findOne({ name: defId });
    def.transformToTransaction(doc);
    const afContext = this;
    Transactions.methods.insert.call(doc, function handler(err, res) {
      if (err) {
//        displayError(err);
        afContext.done(err);
        return;
      }
      afContext.done(null, res);
    });
    return false;
  },
});
