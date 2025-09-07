import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import { __ } from '/imports/localization/i18n.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Listings } from './listings.js';
import './methods.js';

Listings.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: __('new') + ' ' + __('listing'),
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('listings.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.listing.create',
        collection: Listings,
        doc,
        type: 'method',
        meteormethod: 'listings.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('listings.upsert', doc),
    run: () => importCollectionFromFile(Listings),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('listings.inCommunity', doc),
    href: FlowRouter.path('Listing show', { _lid: doc._id }),
    run() {
      FlowRouter.go('Listing show', { _lid: doc._id });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('listings.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.listing.edit',
        collection: Listings,
        doc,
        type: 'method-update',
        meteormethod: 'listings.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('listings.remove', doc),
    run() {
      Modal.confirmAndCall(Listings.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'listing',
        message: 'You should rather archive it',
      });
    },
  }),
};

Listings.batchActions = {
  delete: new BatchAction(Listings.actions.delete, Listings.methods.batch.remove),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.listing.create');
AutoForm.addModalHooks('af.listing.edit');
AutoForm.addHooks('af.listing.create', {
  formToDoc(doc) {
    // doc.creatorId = Meteor.userId();
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.listing.edit', {
  formToModifier(modifier) {
    //    modifier.$set.approved = true;
    return modifier;
  },
});
