import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Buckets } from './buckets.js';
import './entities.js';
import './methods.js';

Buckets.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    color: 'primary',
    label: `${__('new')}  ${__(options.entity.name)}`,
    visible: user.hasPermission('buckets.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: `af.bucket.create`,
        doc,
        type: 'method',
        meteormethod: 'buckets.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('buckets.inCommunity', { communityId: ModalStack.getVar('communityId') }),
    run() {
      Modal.show('Autoform_modal', {
        id: `af.bucket.view`,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('buckets.update', { communityId: ModalStack.getVar('communityId') }),
    run() {
      Modal.show('Autoform_modal', {
        id: `af.bucket.edit`,
        doc,
        type: 'method-update',
        meteormethod: 'buckets.update',
        singleMethodArgument: true,
        description: __('warningAccountWillBeMoved'),
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('buckets.remove', doc),
    run() {
      Modal.confirmAndCall(Buckets.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'bucket',
        message: __('warningAccountRemoval'),
      });
    },
  }),
};

Buckets.batchActions = {
  delete: new BatchAction(Buckets.actions.delete, Buckets.methods.batch.remove),
};

//-----------------------------------------------

  AutoForm.addModalHooks(`af.bucket.create`);
  AutoForm.addModalHooks(`af.bucket.edit`);
  AutoForm.addHooks(`af.bucket.create`, {
    formToDoc(doc) {
      if (doc.code && doc.code.charAt(0) !== Buckets.rootCode) doc.code = Buckets.rootCode + doc.code;
      return doc;
    },
  });
  AutoForm.addHooks(`af.bucket.edit`, {
    formToModifier(modifier) {
      modifier.$set.communityId = ModalStack.getVar('communityId'); // overriding the templateId
      return modifier;
    },
  });

