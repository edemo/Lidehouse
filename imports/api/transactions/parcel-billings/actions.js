import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

ParcelBillings.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: currentUserHasPermission('parcelBillings.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.insert',
        collection: ParcelBillings,
        type: 'method',
        meteormethod: 'parcelBillings.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: currentUserHasPermission('parcelBillings.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.view',
        collection: ParcelBillings,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: currentUserHasPermission('parcelBillings.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.update',
        collection: ParcelBillings,
        doc,
        type: 'method-update',
        meteormethod: 'parcelBillings.update',
        singleMethodArgument: true,
      });
    },
  }),
  apply: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'apply',
    icon: 'fa fa-calendar-plus-o',
    visible: currentUserHasPermission('parcelBillings.apply', doc),
    run() {
      const communityId = Session.get('activeCommunityId');
      const billing = doc || ParcelBillings.findOne({ communityId, active: true });
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        description: `${__('schemaParcelBillings.lastAppliedAt.label')} > ${Render.formatDate(billing.lastAppliedAt().date)}`,
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.apply',
      });
    },
  }), /*
  revert: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'revert',
    icon: 'fa fa-calendar-times-o',
    visible: currentUserHasPermission('parcelBillings.revert', doc),
    run() {
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.revert',
      });
    },
  }),*/
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: currentUserHasPermission('parcelBillings.remove', doc),
    run() {
      Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: doc._id }, {
        action: 'delete parcelBilling',
        message: 'It will disappear forever',
      });
    },
  }),
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

AutoForm.addHooks('af.parcelBilling.update', {
  formToModifier(modifier) {
    // TODO: nasty hack to trick autoform - AF is trying to $unset these, and then throws error, that these values are mandatory
    delete modifier.$unset['consumption.service'];
    delete modifier.$unset['consumption.charges'];
    return modifier;
  },
});

AutoForm.addHooks('af.parcelBilling.apply', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
