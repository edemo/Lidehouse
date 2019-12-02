import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

ParcelBillings.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('parcelBillings.insert'),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.insert',
        collection: ParcelBillings,
        type: 'method',
        meteormethod: 'parcelBillings.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('parcelBillings.inCommunity'),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.view',
        collection: ParcelBillings,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('parcelBillings.update'),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.update',
        collection: ParcelBillings,
        doc,
        type: 'method-update',
        meteormethod: 'parcelBillings.update',
        singleMethodArgument: true,
      });
    },
  },
  apply: {
    name: 'apply',
    icon: () => 'fa fa-calendar-plus-o',
    visible: () => currentUserHasPermission('parcelBillings.apply'),
    run(options, doc) {
      const communityId = Session.get('activeCommunityId');
      const billing = doc || ParcelBillings.findOne({ communityId, active: true });
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        description: `${__('schemaParcelBillings.lastAppliedAt.label')} > ${moment(billing.lastAppliedAt().valueDate).format('L')}`,
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.apply',
      });
    },
  }, /*
  revert: {
    name: 'revert',
    icon: () => 'fa fa-calendar-times-o',
    visible: () => currentUserHasPermission('parcelBillings.revert'),
    run(options) {
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.revert',
      });
    },
  },*/
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: () => currentUserHasPermission('parcelBillings.remove'),
    run(options, doc) {
      Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: doc._id }, {
        action: 'delete parcelBilling',
        message: 'It will disappear forever',
      });
    },
  },
};

//--------------------------------------------------

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
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
