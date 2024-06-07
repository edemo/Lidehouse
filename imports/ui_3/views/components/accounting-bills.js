import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { validDateOrUndefined } from '/imports/api/utils';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { partnersFinancesColumns } from '/imports/api/partners/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/actions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { billColumns, receiptColumns } from '/imports/api/transactions/bills/tables.js';
import { paymentsColumns } from '/imports/api/transactions/payments/tables.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import '/imports/api/transactions/parcel-billings/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import '/imports/ui_3/views/components/print-action.js';
import '/imports/ui_3/views/components/parcel-billings.js';
import '/imports/ui_3/views/components/select-voters.js';
import '/imports/ui_3/views/components/accounting-filter.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/components/lazy-tab.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  share: 'accountingFilter',
  onCreated(instance) {
    ModalStack.setVar('relation', this.activePartnerRelation(), true);
    instance.autorun(() => {
      //initializeDatatablesSelectButtons('Bills');
      const communityId = this.communityId();
      instance.subscribe('parcelBillings.inCommunity', { communityId });
      instance.subscribe('balances.inCommunity', { communityId, partners: [], tag: 'T', notNull: true });
    });
  },
  paymentsWoStatement() {
    return this.community()?.settings?.paymentsWoStatement;
  },
  parcelBillings() {
    return ParcelBillings.find({ communityId: this.communityId() });
  },
  collectionOf(activePartnerRelation) {
    switch (activePartnerRelation) {
      case 'supplier':
      case 'customer': return 'bills';
      case 'member': return 'parcelBillings';
      default: debugAssert(false, 'No such bill relation'); return undefined;
    }
  },
  findTxdefs(category) {
    const txdefs = Txdefs.findTfetch({
      communityId: this.communityId(),
      category,
      'data.relation': this.activePartnerRelation(),
    });
    return txdefs || {};
  },
  count(category, kind) {
    const selector = { communityId: this.communityId(), category, relation: this.activePartnerRelation() };
    if (kind === 'outstanding') {
      if (!_.contains(this.community()?.settings.paymentsToBills, this.activePartnerRelation())) return 0;
      selector.outstanding = { $ne: 0 };
    } else if (kind === 'unposted') selector.status = 'draft';
    else if (kind === 'unreconciled') selector.reconciled = false;
    const txs = Transactions.find(selector);
    return txs.count();
  },
  countOverduePartners(color) {
    const partners = Partners.find({ communityId: this.communityId(), relation: this.activePartnerRelation() });
    const overdues = partners.fetch().filter(partner => partner.balance() !== 0 && partner.mostOverdueDaysColor() === color);
    return overdues.length;
  },
  txTableDataFn(category) {
    const self = this;
    return () => Transactions.find(self.filterSelector(category)).fetch();
  },
/*  transactionsSubscriptionFn() {
    const self = this;
    return (instance) => {
      const params = self.transactionsSubscriptionParams();
      if (params) {
        instance.subscribe('transactions.inCommunity', params);
      }
    };
  }, */
  billsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.filterSelector('bill')).fetch();
  },
  billsOptionsFn() {
    return () => Object.create({
      columns: billColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesSelectButtons(Transactions),
    });
  },
  paymentsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.filterSelector('payment')).fetch();
  },
  paymentsOptionsFn() {
    return () => Object.create({
      columns: paymentsColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesSelectButtons(Transactions),
    });
  },
  receiptsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.filterSelector('receipt')).fetch();
  },
  receiptsOptionsFn() {
    return () => Object.create({
      columns: receiptColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesSelectButtons(Transactions),
    });
  },
  partnersFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.relation = this.activePartnerRelation();
    return selector;
  },
/*   partnersSubscriptionFn() {
    const self = this;
    return (instance) => {
      instance.subscribe('balances.inCommunity', { communityId: self.communityId(), partners: [], tags: ['T'] });
    };
  }, */
  partnersTableDataFn() {
    const self = this;
    return () => {
      let partners = Partners.find(self.partnersFilterSelector()).fetch();
      if (self.unreconciledOnly()) partners = partners.filter(p => p.balance());
      return partners;
    };
  },
  partnersOptionsFn() {
    return () => Object.create({
      columns: partnersFinancesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
  contractsForPartnerLedger() {
    return Contracts.find({ communityId: this.communityId(), relation: this.activePartnerRelation() }).fetch();
  },
  periodTagFromBeginDate() {
    const beginDate = validDateOrUndefined(this.beginDate());
    const periodTag = `T-${beginDate.getFullYear()}`;
    return periodTag;
  },
});

Template.Accounting_bills.events({
  'click .js-create'(event, instance) {
    const entity = $(event.target).closest('[data-entity]').data('entity');
    const defId = $(event.target).closest('[data-defid]').data('defid');
    const txdef = Txdefs.findOne(defId);
    Transactions.actions.create({ entity, txdef }).run(event, instance);
  },
  'click .js-apply'(event, instance) {
    ParcelBillings.actions.apply().run();
  },
  'click .js-edit-defs'(event, instance) {
    const modalContext = {
      id: 'parcelbillings.view',
      title: 'Parcel billings',
      body: 'Parcel_billings',
      size: 'lg',
      bodyContext: {},
    };
    Modal.show('Modal', modalContext);
  },
  'click .js-partner-ledger'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    if (!Meteor.user().hasPermission('transactions.inCommunity', { communityId })) return;
    Modal.show('Modal', {
      id: 'partnerledger.view',
      title: __('Partner ledger'),
      body: 'Partner_ledger_report',
      bodyContext: {
        relation: instance.viewmodel.activePartnerRelation(),
        contracts: instance.viewmodel.contractsForPartnerLedger(),
        tag: instance.viewmodel.periodTagFromBeginDate(),
      },
      size: 'lg',
    });
  },
});
