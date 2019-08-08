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
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import '/imports/ui_3/views/components/parcel-billings.js';
import '/imports/ui_3/views/components/select-voters.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  activeBillCategory: 'in',
  outstandingOnly: true,
  showParcelBillings: false,
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('parcelBillings.inCommunity', { communityId: this.communityId() });
      if (this.outstandingOnly()) {
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
    return (this.outstandingOnly() === false);
  },
  filterSelector() {
    const selector = { communityId: this.communityId() };
    selector.category = this.activeBillCategory();
    if (this.outstandingOnly()) selector.outstanding = { $gt: 0 };
    return selector;
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
  billsTableDataFn() {
    const self = this;
    return () => Bills.find(self.filterSelector()).fetch();
  },
  billsOptionsFn() {
    return () => {
      const permissions = {
        view: Meteor.userOrNull().hasPermission('bills.inCommunity', this.communityId()),
        edit: Meteor.userOrNull().hasPermission('bills.update', this.communityId()),
        statusUpdate: Meteor.userOrNull().hasPermission('bills.update', this.communityId()),
        delete: Meteor.userOrNull().hasPermission('bills.remove', this.communityId()),
      };
      return {
        columns: billColumns(permissions),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
        pageLength: 25,
        ...DatatablesExportButtons,
      };
    };
  },
});

Template.Accounting_bills.events({
  'click .js-view'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.view',
      collection: Bills,
      omitFields: ['category'],
      doc: Bills.findOne(id),
      type: 'readonly',
    });
  },
  'click .js-new'(event, instance) {
    const activeBillCategory = instance.viewmodel.activeBillCategory();
    Session.set('activeBillCategory', activeBillCategory);
    Modal.show('Autoform_edit', {
      id: 'af.bill.insert',
      collection: Bills,
      omitFields: ['category', 'payments'],
      type: 'method',
      meteormethod: 'bills.insert',
    });
  },
  'click .js-new-def'(event, instance) {
    debugAssert(instance.viewmodel.activeBillCategory() === 'parcel');
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.insert',
      collection: ParcelBillings,
      type: 'method',
      meteormethod: 'parcelBillings.insert',
    });
  },
  'click .js-apply'(event, instance) {
    debugAssert(instance.viewmodel.activeBillCategory() === 'parcel');
    const id = $(event.target).closest('[data-id]').data('id');
    Session.set('activeParcelBillingId', id);
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.apply',
      schema: ParcelBillings.applySchema,
      omitFields: ['id'],
      type: 'method',
      meteormethod: 'parcelBillings.apply',
    });
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
  'click .js-edit'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.update',
      collection: Bills,
      omitFields: ['category'],
      doc: Bills.findOne(id),
      type: 'method-update',
      meteormethod: 'bills.update',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.confirmAndCall(Bills.methods.remove, { _id: id }, {
      action: 'delete bill',
      message: 'It will disappear forever',
    });
  },
  'click .js-status-update'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Session.set('activeBillId', id);
    Modal.show('Autoform_edit', {
      id: 'af.bill.pay',
      collection: Bills,
      schema: Bills.paymentSchema,
      type: 'method',
      meteormethod: 'transactions.reconcile',
    });
  },
  'click .js-category-filter'(event, instance) {
    const billCategory = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activeBillCategory(billCategory);
  },
});

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addModalHooks('af.bill.pay');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = Session.get('activeBillCategory');
    return doc;
  },
});

AutoForm.addHooks('af.bill.pay', {
  formToDoc(doc) {
    doc._id = Session.get('activeBillId');
    return doc;
  },
});

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.parcelBilling.apply');
AutoForm.addHooks('af.parcelBilling.apply', {
  formToDoc(doc) {
//    doc.communityId = Session.get('activeCommunityId');
    doc.id = Session.get('activeParcelBillingId');
    return doc;
  },
});
