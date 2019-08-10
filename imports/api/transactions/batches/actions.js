import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

export function allParcelBillingActions() {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  ParcelBillings.actions = ParcelBillings.actions || {
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      permission: user.hasPermission('parcelBillings.insert', communityId),
      run() {
        Modal.show('Autoform_edit', {
          id: 'af.parcelBilling.insert',
          collection: ParcelBillings,
          type: 'method',
          meteormethod: 'parcelBillings.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      permission: user.hasPermission('parcelBillings.inCommunity', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.parcelBilling.view',
          collection: ParcelBillings,
          doc: ParcelBillings.findOne(id),
          type: 'readonly',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      permission: user.hasPermission('parcelBillings.update', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.parcelBilling.update',
          collection: ParcelBillings,
          doc: ParcelBillings.findOne(id),
          type: 'method-update',
          meteormethod: 'parcelBillings.update',
          singleMethodArgument: true,
        });
      },
    },
    apply: {
      name: 'apply',
      icon: 'fa fa-calendar-plus-o',
      permission: user.hasPermission('parcelBillings.apply', communityId),
      run(id) {
        Session.set('activeParcelBillingId', id);
        Modal.show('Autoform_edit', {
          id: 'af.parcelBilling.apply',
          schema: ParcelBillings.applySchema,
          omitFields: ['id'],
          type: 'method',
          meteormethod: 'parcelBillings.apply',
        });
      },
    },
    revert: {
      name: 'revert',
      icon: 'fa fa-calendar-times-o',
      permission: user.hasPermission('parcelBillings.revert', communityId),
      run(id) {
        Session.set('activeParcelBillingId', id);
        Modal.show('Autoform_edit', {
          id: 'af.parcelBilling.apply',
          schema: ParcelBillings.applySchema,
          omitFields: ['id'],
          type: 'method',
          meteormethod: 'parcelBillings.revert',
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      permission: user.hasPermission('parcelBillings.remove', communityId),
      run(id) {
        Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: id }, {
          action: 'delete parcelBilling',
          message: 'It will disappear forever',
        });
      },
    },
  };
  return ParcelBillings.actions;
}

export function getParcelBillingActionsSmall() {
  allParcelBillingActions();
  const actions = [
    ParcelBillings.actions.view,
    ParcelBillings.actions.edit,
    ParcelBillings.actions.apply,
    ParcelBillings.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addModalHooks('af.parcelBilling.update');
AutoForm.addModalHooks('af.parcelBilling.apply');

AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addHooks('af.parcelBilling.apply', {
  formToDoc(doc) {
//    doc.communityId = Session.get('activeCommunityId');
    doc.id = Session.get('activeParcelBillingId');
    return doc;
  },
});
