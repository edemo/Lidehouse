import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import '/imports/api/transactions/batches/methods.js';
import { parcelBillingColumns } from '/imports/api/transactions/batches/tables.js';
import './parcel-billings.html';

Template.Parcel_billings.viewmodel({
  communityId() {
    return Session.get('activeCommunityId');
  },
  tableDataFn() {
    return () => ParcelBillings.find().fetch();
  },
  optionsFn() {
    return () => {
      const permissions = {
        view: Meteor.userOrNull().hasPermission('parcelBillings.inCommunity', this.communityId()),
        edit: Meteor.userOrNull().hasPermission('parcelBillings.update', this.communityId()),
        apply: Meteor.userOrNull().hasPermission('parcelBillings.apply', this.communityId()),
        revert: Meteor.userOrNull().hasPermission('parcelBillings.revert', this.communityId()),
        delete: Meteor.userOrNull().hasPermission('parcelBillings.remove', this.communityId()),
      };
      return {
        columns: parcelBillingColumns(permissions),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[5, 10, 50, -1], [5, 10, 50, __('all')]],
        pageLength: 10,
      };
    };
  },
});

Template.Parcel_billings.events({
  'click .js-view'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.view',
      collection: ParcelBillings,
      doc: ParcelBillings.findOne(id),
      type: 'readonly',
    });
  },
  'click .js-edit'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.update',
      collection: ParcelBillings,
      doc: ParcelBillings.findOne(id),
      type: 'method-update',
      meteormethod: 'parcelBillings.update',
      singleMethodArgument: true,
    });
  },
  'click .js-delete'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: id }, {
      action: 'delete parcelBilling',
      message: 'It will disappear forever',
    });
  },
});
