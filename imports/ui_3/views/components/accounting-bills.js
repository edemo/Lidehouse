import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { debugAssert } from '/imports/utils/assert.js';
import { DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Session } from 'meteor/session';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/transactions/partners/partners.js';
import { partnersColumns } from '/imports/api/transactions/partners/tables.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { billColumns } from '/imports/api/transactions/bills/tables.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import { paymentsColumns } from '/imports/api/transactions/payments/tables.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { allPartnersActions } from '/imports/api/transactions/partners/actions.js';
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
  activePartnerRelation: 'supplier',
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
    switch(activePartnerRelation) {
      case 'supplier':
      case 'customer': return 'bills';
      case 'parcel': return 'parcelBillings';
      default: debugAssert(false, 'No such bill relation')
    }
  },
  billsFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.relation = this.activePartnerRelation();
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
      ...DatatablesSelectButtons,
    });
  },
  paymentsFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.relation = this.activePartnerRelation();
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
      ...DatatablesSelectButtons,
    });
  },
  partnersFilterSelector() {
    const selector = { communityId: this.communityId() };
    selector.relation = this.activePartnerRelation() === 'parcel' ? undefined : this.activePartnerRelation();
    if (this.unreconciledOnly()) selector.outstanding = { $gt: 0 };
    return selector;
  },
  partnersTableDataFn() {
    const self = this;
    return () => Partners.relCollection(this.activePartnerRelation()).find(self.partnersFilterSelector()).fetch();
  },
  partnersOptionsFn() {
    return () => Object.create({
      columns: partnersColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
});

Template.Accounting_bills.events({
  ...(actionHandlers(allBillsActions())),
  ...(actionHandlers(allPaymentsActions())),
  ...(actionHandlers(allPartnersActions())),
  ...(actionHandlers(allParcelBillingActions())),
});

Template.Accounting_bills.events({
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
    instance.viewmodel.showParcelBillings(false);
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
