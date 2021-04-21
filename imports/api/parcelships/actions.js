import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Parcelships } from './parcelships.js';
import './methods.js';

Parcelships.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    label: __('new') + ' ' + __('parcelship'),
    visible: user.hasPermission('parcelships.insert', doc),
    run() {
      doc.parcelId = ModalStack.getVar('parcelId');
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.create',
        collection: Parcelships,
        doc,
        omitFields: [],
        type: 'method',
        meteormethod: 'parcelships.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('parcelships.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.view',
        collection: Parcelships,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('parcelships.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.edit',
        collection: Parcelships,
        omitFields: ['leadParcelId'],
        doc,
        type: 'method-update',
        meteormethod: 'parcelships.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('parcelships.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.edit',
        collection: Parcelships,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'parcelships.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('parcelships.remove', doc),
    run() {
      Modal.confirmAndCall(Parcelships.methods.remove, { _id: doc._id }, {
        action: 'delete parcelship',
        message: 'You should rather archive it',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.parcelship.create');
AutoForm.addModalHooks('af.parcelship.edit');
AutoForm.addHooks('af.parcelship.create', {
  formToDoc(doc) {
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.parcelship.edit', {
  formToModifier(modifier) {
    delete modifier.$set.leadParcelId; // not working
    return modifier;
  },
});
