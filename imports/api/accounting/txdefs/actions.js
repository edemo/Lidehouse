import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Txdefs } from './txdefs.js';
import './methods.js';

Txdefs.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    color: 'primary',
    label: `${__('new')} ${__('txdef')}`,
    visible: user.hasPermission('accounts.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.create',
        collection: Txdefs,
        doc,
        type: 'method',
        meteormethod: 'txdefs.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('accounts.inCommunity', { communityId: ModalStack.getVar('communityId') }),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.view',
        collection: Txdefs,
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
      Modal.show('Autoform_modal', {
        id: 'af.txdef.edit',
        collection: Txdefs,
        doc,
        type: 'method-update',
        meteormethod: 'txdefs.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('accounts.remove', doc),
    run() {
      Modal.confirmAndCall(Txdefs.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'txdef',
      });
    },
  }),
};

Txdefs.batchActions = {
  delete: new BatchAction(Txdefs.actions.delete, Txdefs.methods.batch.remove),
};

//------------------------------------------------------

AutoForm.addModalHooks('af.txdef.create');
AutoForm.addModalHooks('af.txdef.edit');
AutoForm.addHooks('af.txdef.edit', {
  formToModifier(modifier) {
    modifier.$set.communityId = ModalStack.getVar('communityId'); // overriding the templateId
    return modifier;
  },
});
