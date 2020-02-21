import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { debugAssert } from '/imports/utils/assert.js';
import { Session } from 'meteor/session';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { partnersColumns } from '/imports/api/partners/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { billColumns, receiptColumns } from '/imports/api/transactions/bills/tables.js';
import { paymentsColumns } from '/imports/api/transactions/payments/tables.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import '/imports/api/transactions/parcel-billings/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import '/imports/ui_3/views/components/bill-view.js';
import '/imports/ui_3/views/components/bill-edit.js';
import '/imports/ui_3/views/components/payment-view.js';
import '/imports/ui_3/views/components/payment-edit.js';
import '/imports/ui_3/views/components/parcel-billings.js';
import '/imports/ui_3/views/components/select-voters.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  activePartnerRelation: 'supplier',
  unreconciledOnly: true,
  unpostedOnly: false,
  onCreated(instance) {
    instance.autorun(() => {
      //initializeDatatablesSelectButtons('Bills');
      instance.subscribe('parcelBillings.inCommunity', { communityId: this.communityId() });
      if (this.unreconciledOnly()) {
        instance.subscribe('transactions.unreconciled', { communityId: this.communityId() });
        instance.subscribe('transactions.outstanding', { communityId: this.communityId() });
      } else {
        instance.subscribe('transactions.inCommunity', { communityId: this.communityId() });
      }
    });
  },
  autorun() {
    Session.set('activePartnerRelation', this.activePartnerRelation());
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  hasFilters() {
    return (this.unreconciledOnly() === false);
  },
  parcelBillings() {
    return ParcelBillings.find({ communityId: this.communityId() });
  },
  partnerRelations() {
    return Partners.relationValues;
  },
  activeClass(partnerRelation) {
    return (this.activePartnerRelation() === partnerRelation) && 'active';
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
  billsFilterSelector() {
    const selector = { communityId: this.communityId(), category: 'bill' };
    selector.relation = this.activePartnerRelation();
    if (this.unreconciledOnly()) selector.outstanding = { $gt: 0 };
    if (this.unpostedOnly()) selector.complete = false;
    return selector;
  },
  billsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.billsFilterSelector()).fetch();
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
  paymentsFilterSelector() {
    const selector = { communityId: this.communityId(), category: 'payment' };
    selector.relation = this.activePartnerRelation();
    if (this.unreconciledOnly()) selector.seId = { $exists: false };
    if (this.unpostedOnly()) selector.complete = false;
    return selector;
  },
  paymentsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.paymentsFilterSelector()).fetch();
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
      columns: partnersColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
  receiptsFilterSelector() {
    const selector = { communityId: this.communityId(), category: 'receipt' };
    selector.relation = this.activePartnerRelation();
    if (this.unpostedOnly()) selector.complete = false;
    return selector;
  },
  receiptsTableDataFn() {
    const self = this;
    return () => Transactions.find(self.receiptsFilterSelector()).fetch();
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
});

Template.Accounting_bills.events({
  ...(actionHandlers(Transactions, 'new')),
});

Template.Accounting_bills.events({
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
  },
  'click .js-apply'(event, instance) {
    ParcelBillings.actions.apply.run();
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
