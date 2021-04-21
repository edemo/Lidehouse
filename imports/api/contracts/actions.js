import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { Contracts } from './contracts.js';
import './methods.js';

Contracts.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: __('new') + ' ' + __('contract'),
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('contracts.insert', doc),
    run() {
      const relation = AutoForm.getFieldValue('relation') ||  ModalStack.getVar('relation');
      if (relation) _.extend(doc, { relation });
      const partnerId = AutoForm.getFieldValue('partnerId') ||  ModalStack.getVar('partnerId');
      if (partnerId) _.extend(doc, { partnerId });
      const parcelId = AutoForm.getFieldValue('parcelId') || ModalStack.getVar('parcelId');
      if (parcelId) _.extend(doc, { parcelId });
      Modal.show('Autoform_modal', {
        id: 'af.contract.create',
        schema: Contracts.simpleSchema(doc),
        doc,
        type: 'method',
        meteormethod: 'contracts.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('contracts.upsert', doc),
    run: () => importCollectionFromFile(Contracts),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('contracts.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.contract.view',
        schema: Contracts.simpleSchema(doc),
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('contracts.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.contract.edit',
        schema: Contracts.simpleSchema(doc),
        doc,
        type: 'method-update',
        meteormethod: 'contracts.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('contracts.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.contract.edit',
        schema: ActivePeriod.schema,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'contracts.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('contracts.remove', doc),
    run() {
      Modal.confirmAndCall(Contracts.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'contract',
        message: 'It will disappear forever',
      });
    },
  }),
};

Contracts.batchActions = {
  delete: new BatchAction(Contracts.actions.delete, Contracts.methods.batch.remove),
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.contract.create');
AutoForm.addModalHooks('af.contract.edit');
