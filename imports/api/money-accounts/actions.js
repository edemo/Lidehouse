import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { MoneyAccounts } from './money-accounts.js';
import './entities.js';
import './methods.js';

MoneyAccounts.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('moneyAccounts.insert', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: `af.${options.entity.name}.insert`,
        schema: options.entity.schema,
        type: 'method',
        meteormethod: 'moneyAccounts.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('moneyAccounts.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.view`,
        schema: MoneyAccounts.simpleSchema(doc),
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('moneyAccounts.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.update`,
        schema: MoneyAccounts.simpleSchema(doc),
        doc,
        type: 'method-update',
        meteormethod: 'moneyAccounts.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('moneyAccounts.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(MoneyAccounts.methods.remove, { _id: doc._id }, {
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
