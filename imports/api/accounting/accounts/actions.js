import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Accounts } from './accounts.js';
import './entities.js';
import './methods.js';

Accounts.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    color: 'primary',
    label: `${__('new')}  ${__(options.entity.name)}`,
//    label: (Array.isArray(options.entity) ? `${__('new')}  ${__('simpleAccount')}` : `${__('new')} ${__(/*'schemaAccounts.category.options.' + */options.entity.name)}`),
    visible: user.hasPermission('accounts.insert', doc),
//    subActions: options => Array.isArray(options.entity) && options.entity.length,
//    subActionsOptions: (options, doc) => options.entity.map(entity => ({ entity })),
    run() {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.create`,
        schema: options.entity.schema,
        doc,
        type: 'method',
        meteormethod: 'accounts.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('accounts.inCommunity', { communityId: ModalStack.getVar('communityId') }),
    run() {
      const entityName = doc.entityName();
      const entity = Accounts.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${entityName}.view`,
        schema: Accounts.simpleSchema(doc),
//        omitFields: ['category'],
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('accounts.update', { communityId: ModalStack.getVar('communityId') }),
    run() {
      const entityName = doc.entityName();
      const entity = Accounts.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${entityName}.edit`,
        schema: Accounts.simpleSchema(doc),
        omitFields: ['category'],
        doc,
        type: 'method-update',
        meteormethod: 'accounts.update',
        singleMethodArgument: true,
        description: __('warningAccountWillBeMoved'),
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('accounts.remove', doc),
    run() {
      Modal.confirmAndCall(Accounts.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: doc.entityName(),
        message: __('warningAccountRemoval'),
      });
    },
  }),
};

Accounts.batchActions = {
  delete: new BatchAction(Accounts.actions.delete, Accounts.methods.batch.remove),
};

//-----------------------------------------------

_.each(Accounts.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.create`);
  AutoForm.addModalHooks(`af.${entityName}.edit`);
  AutoForm.addHooks(`af.${entityName}.create`, {
    formToDoc(doc) {
      if (doc.code && doc.code.charAt(0) !== '`') doc.code = '`' + doc.code;
      return doc;
    },
  });
  AutoForm.addHooks(`af.${entityName}.edit`, {
    formToModifier(modifier) {
      modifier.$set.communityId = ModalStack.getVar('communityId'); // overriding the templateId
      return modifier;
    },
  });
});
