import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { debugAssert } from '/imports/utils/assert.js';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Session } from 'meteor/session';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { billColumns } from '/imports/api/transactions/bills/tables.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import { paymentsColumns } from '/imports/api/transactions/payments/tables.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { allBillsActions } from '/imports/api/transactions/bills/actions.js';
import { allPaymentsActions } from '/imports/api/transactions/payments/actions.js';
import { allParcelBillingActions } from '/imports/api/transactions/parcel-billings/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/parcel-billings.js';
import '/imports/ui_3/views/components/select-voters.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  activeBillCategory: 'in',
  unreconciledOnly: true,
  unconteeredOnly: false,
  showParcelBillings: false,
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('parcelBillings.inCommunity', { communityId: this.communityId() });
      if (this.unreconciledOnly()) {
        instance.subscribe('bills.outstanding', { communityId: this.communityId() });
      } else {
        instance.subscribe('bills.filtered', { communityId: this.communityId() });
      }
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  hasFilters() {
    return (this.unreconciledOnly() === false);
  },
  myLeadParcels() {
    const communityId = this.communityId();
    const user = Meteor.user();
    if (!user || !communityId) return [];
    return user.ownedLeadParcels().map(p => p.ref);
  },
  myLeadParcelOptions() {
    const communityId = Session.get('activeCommunityId');
    const myOwnerships = Memberships.find({ communityId, active: true, approved: true, personId: Meteor.userId(), role: 'owner' });
    const myLeadParcelRefs = _.uniq(myOwnerships.map(m => { 
      const parcel = m.parcel();
      return (parcel && !parcel.isLed()) ? parcel.ref : null;
    }));
    return myLeadParcelRefs.map((ref) => { return { label: ref, value: ref }; });
  },
  parcelChoices() {
    return Parcels.find().map((parcel) => {
      return { label: parcel.display(), value: Localizer.parcelRef2code(parcel.ref) };
    });
  },
  parcelBillings() {
    return ParcelBillings.find({ communityId: this.communityId() });
  },
  billCategories() {
    return Bills.categoryValues;
  },
  activeClass(billCategory) {
    return (this.activeBillCategory() === billCategory) && 'active';
  },
  billsFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.category = this.activeBillCategory();
    if (this.unreconciledOnly()) selector.outstanding = { $gt: 0 };
    if (this.unconteeredOnly()) selector.txId = { $exists: false };
    return selector;
  },
  billsTableDataFn() {
    const self = this;
    return () => Bills.find(self.billsFilterSelector()).fetch();
  },
  billsOptionsFn() {
    return () => Object.create({
      columns: billColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
  paymentsFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.category = this.activeBillCategory();
    if (this.unreconciledOnly()) selector.reconciledId = { $exists: false };
    if (this.unconteeredOnly()) selector.txId = { $exists: false };
    return selector;
  },
  paymentsTableDataFn() {
    const self = this;
    return () => Payments.find(self.paymentsFilterSelector()).fetch();
  },
  paymentsOptionsFn() {
    return () => Object.create({
      columns: paymentsColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
});

Template.Accounting_bills.events({
  ...(actionHandlers(allBillsActions())),
  ...(actionHandlers(allPaymentsActions())),
  ...(actionHandlers(allParcelBillingActions())),
});

Template.Accounting_bills.events({
  'click .js-category-filter'(event, instance) {
    const billCategory = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activeBillCategory(billCategory);
  },
  'click .js-edit-defs'(event, instance) {
    instance.viewmodel.showParcelBillings(true);
/*    const modalContext = {
      title: 'Parcel billings',
      body: 'Parcel_billings',
      size: 'lg',
      bodyContext: {},
      btnClose: 'cancel',
    };
    Modal.show('Modal', modalContext);*/
  },
});
