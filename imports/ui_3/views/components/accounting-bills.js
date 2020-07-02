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
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { partnersFinancesColumns } from '/imports/api/partners/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
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
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  share: 'accountingFilter',
  onCreated(instance) {
    instance.autorun(() => {
      //initializeDatatablesSelectButtons('Bills');
      instance.subscribe('parcelBillings.inCommunity', { communityId: this.communityId() });
    });
  },
  autorun() {
    ModalStack.setVar('relation', this.activePartnerRelation(), true);
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
  findTxdef(category) {
    const txdef = Txdefs.findOne({ 
      communityId: this.communityId(),
      category,
      'data.relation': this.activePartnerRelation(),
    });
    return txdef || {};
  },
  count(category, kind) {
    const selector = { communityId: this.communityId(), category, relation: this.activePartnerRelation() };
    if (kind === 'outstanding') selector.outstanding = { $gt: 0 };
    else if (kind === 'unposted') selector.postedAt = { $exists: false };
    else if (kind === 'unreconciled') selector.seId = { $exists: false };
    const txs = Transactions.find(selector);
    return txs.count();
  },
  countOverduePartners(color) {
    const partners = Partners.find({ communityId: this.communityId(), relation: this.activePartnerRelation(), outstanding: { $gt: 0 } });
    const overdues = partners.fetch().filter(partner => partner.mostOverdueDaysColor() === color);
    return overdues.length;
  },
  txTableDataFn(category) {
    const self = this;
    return () => Transactions.find(self.filterSelector(category)).fetch();
  },
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
    if (this.unreconciledOnly()) selector.outstanding = { $gt: 0 };
    return selector;
  },
  partnersTableDataFn() {
    const self = this;
    return () => Partners.find(self.partnersFilterSelector()).fetch();
  },
  partnersOptionsFn() {
    return () => Object.create({
      columns: partnersFinancesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
});

Template.Accounting_bills.events({
  'click .js-new'(event, instance) {
    const entity = $(event.target).closest('[data-entity]').data('entity');
    const txdef = instance.viewmodel.findTxdef(entity);
    Transactions.actions.new({ entity, txdef }).run(event, instance);
  },
  'click .js-apply'(event, instance) {
    ParcelBillings.actions.apply().run();
  },
  'click .js-edit-defs'(event, instance) {
    const modalContext = {
      title: 'Parcel billings',
      body: 'Parcel_billings',
      size: 'lg',
      bodyContext: {},
    };
    Modal.show('Modal', modalContext);
  },
});
