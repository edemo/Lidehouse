import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Session } from 'meteor/session';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { billColumns } from '/imports/api/transactions/bills/tables.js';

import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '../common/ibox-tools.js';
import '../components/balance-widget.js';
import '../components/balance-report.js';
import './accounting-bills.html';

Template.Accounting_bills.viewmodel({
  activeBillCategory: 'in',
  outstandingOnly: true,
  onCreated(instance) {
    instance.autorun(() => {
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
    Session.set('activeBillCategory', instance.viewmodel.activeBillCategory());
    Modal.show('Autoform_edit', {
      id: 'af.bill.insert',
      collection: Bills,
      omitFields: ['category', 'payments'],
      type: 'method',
      meteormethod: 'bills.insert',
    });
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
