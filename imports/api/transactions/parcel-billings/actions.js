import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

ParcelBillings.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission('parcelBillings.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.create',
        collection: ParcelBillings,
        doc,
        type: 'method',
        meteormethod: 'parcelBillings.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('parcelBillings.inCommunity', doc),
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
    visible: user.hasPermission('parcelBillings.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.edit',
        collection: ParcelBillings,
        doc,
        type: 'method-update',
        meteormethod: 'parcelBillings.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('parcelBillings.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.edit',
        schema: ActivePeriod.schema,
        doc,
        type: 'method-update',
        meteormethod: 'parcelBillings.update',
        singleMethodArgument: true,
      });
    },
  }),
  apply: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'apply',
    icon: 'fa fa-money', // fa-calendar-plus-o',
    visible: user.hasPermission('parcelBillings.apply', doc),
    run() {
      const communityId = ModalStack.getVar('communityId');
      const billing = doc || ParcelBillings.findOne({ communityId, active: true });
      ModalStack.setVar('parcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        description: `${__('schemaParcelBillings.lastAppliedAt.label')} > ${Render.formatDate(billing.lastAppliedAt().date)}`,
        schema: ParcelBillings.applySchema,
        doc: doc || defaultNewDoc(),
        type: 'method',
        meteormethod: 'parcelBillings.apply',
      });
    },
  }), /*
  revert: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'revert',
    icon: 'fa fa-calendar-times-o',
    visible: user.hasPermission('parcelBillings.revert', doc),
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
    visible: user.hasPermission('parcelBillings.remove', doc),
    run() {
      Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'parcelBilling',
        message: 'It will disappear forever',
      });
    },
  }),
};

//--------------------------------------------------

AutoForm.addModalHooks('af.parcelBilling.create');
AutoForm.addModalHooks('af.parcelBilling.edit');
AutoForm.addModalHooks('af.parcelBilling.apply');

AutoForm.addHooks('af.parcelBilling.edit', {
  formToModifier(modifier) {
    // TODO: nasty hack to trick autoform - AF is trying to $unset these, and then throws error, that these values are mandatory
    if (modifier.$unset) {
      delete modifier.$unset['consumption.service'];
      delete modifier.$unset['consumption.charges'];
    }
    return modifier;
  },
});

AutoForm.addHooks('af.parcelBilling.apply', {
  formToDoc(doc) {
    if (!doc.ids) doc.ids = []; // When we dont select any, it should mean we dont apply any
    return doc;
  },
});
