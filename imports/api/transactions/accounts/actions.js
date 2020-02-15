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
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('accounts.insert', doc),
    run(options, doc) {
      const entityName = doc.entityName();
      const entity = Accounts.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${options.entity.name}.insert`,
        schema: options.entity.schema,
        omitFields: entity.omitFields,
        type: 'method',
        meteormethod: 'accounts.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('accounts.inCommunity', doc),
    run(options, doc) {
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
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('accounts.update', doc),
    run(options, doc) {
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
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('accounts.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Accounts.methods.remove, { _id: doc._id }, {
        action: 'delete moneyAccount',
        message: 'Some accounting transactions might be connecting to it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.cashAccount.insert');
AutoForm.addModalHooks('af.cashAccount.update');
AutoForm.addHooks('af.cashAccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = 'cash';
    return doc;
  },
});

AutoForm.addModalHooks('af.bankAccount.insert');
AutoForm.addModalHooks('af.bankAccount.update');
AutoForm.addHooks('af.bankAccount.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = 'bank';
    return doc;
  },
});
