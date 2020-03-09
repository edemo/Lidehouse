import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Accounts } from './accounts.js';
import './entities.js';
import './methods.js';

Accounts.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    color: 'primary',
    label: `${__('new')}  ${__(options.entity.name)}`,
//    label: (Array.isArray(options.entity) ? `${__('new')}  ${__('simpleAccount')}` : `${__('new')} ${__(/*'schemaAccounts.category.' + */options.entity.name)}`),
    visible: user.hasPermission('accounts.insert', doc),
//    subActions: options => Array.isArray(options.entity) && options.entity.length,
//    subActionsOptions: (options, doc) => options.entity.map(entity => ({ entity })),
    run() {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.insert`,
        schema: options.entity.schema,
        omitFields: entity.omitFields,
        type: 'method',
        meteormethod: 'accounts.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('accounts.inCommunity', doc),
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
    visible: user.hasPermission('accounts.update', doc),
    run() {
      const entityName = doc.entityName();
      const entity = Accounts.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${entityName}.update`,
        schema: Accounts.simpleSchema(doc),
        omitFields: ['category'],
        doc,
        type: 'method-update',
        meteormethod: 'accounts.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('accounts.remove', doc),
    run() {
      Modal.confirmAndCall(Accounts.methods.remove, { _id: doc._id }, {
        action: 'delete moneyAccount',
        message: 'Some accounting transactions might be connecting to it',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.simpleAccount.insert');
AutoForm.addModalHooks('af.simpleAccount.update');
AutoForm.addHooks('af.simpleAccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    if (doc.code.charAt(0) !== '`') doc.code = '`' + doc.code;
    return doc;
  },
});

AutoForm.addModalHooks('af.cashAccount.insert');
AutoForm.addModalHooks('af.cashAccount.update');
AutoForm.addHooks('af.cashAccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = 'cash';
    if (doc.code.charAt(0) !== '`') doc.code = '`' + doc.code;
    return doc;
  },
});

AutoForm.addModalHooks('af.bankAccount.insert');
AutoForm.addModalHooks('af.bankAccount.update');
AutoForm.addHooks('af.bankAccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = 'bank';
    if (doc.code.charAt(0) !== '`') doc.code = '`' + doc.code;
    return doc;
  },
});
