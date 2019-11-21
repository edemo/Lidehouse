/* global alert */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';

import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { initializeHelpIcons } from '/imports/ui_3/views/blocks/help-icon.js';
import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/modals/multi-modal-handler.js';
import './autoform-edit.html';

// How to instantiate an Autoform_edit window: Modal.show('Autoform_edit', afOptions)
// Make sure afOptions you omitFields if it is auto filled in an Autoform.hook

Template.Autoform_edit.onCreated(function () {
  Session.set('autoformType', this.data.type);
});

Template.Autoform_edit.onRendered(function () {
  const objectName = this.data.id.split('.')[1];
  const collection = Factory.get(objectName).collection;
  const schemaName = `schema${collection._name.capitalize()}`;
  initializeHelpIcons(this, schemaName);
});

Template.Autoform_edit.helpers({
  title() {
    if (this.title) return this.title;
    const split = this.id.split('.'); // AutoFormId convention is 'af.object.action'
    let objectName = split[1];
    let actionName = split[2];
    if (objectName === 'transaction' && actionName === 'insert') {
      objectName = TxCats.findOne(Session.get('activeTxCatId')).name;
    }
    if (actionName === 'statusChange') {
      objectName = 'statusChange';
      actionName = 'insert';
    }
    if (actionName === 'insert') return __('new') + ' ' + __(objectName) + ' ' + __('insertion');
    else if (actionName === 'update') return __(objectName) + ' ' + __('editing data');
    else if (actionName === 'view') return __(objectName) + ' ' + __('viewing data');
    else return __(objectName) + ' ' + __(actionName);
  },
});

AutoForm.addModalHooks = function AutoFormAddModalHooks(afId) {
  AutoForm.addHooks(afId, {
    onError(formType, error) {
      // const errorMessage = __('errorInFormFieldValidation');
      // error.message = errorMessage + '\n' + error.message;
      displayError(error);
    },
    onSuccess(formType, result) {
      Modal.hide(this.template.parent());
      Session.set('modalResult-' + afId, result);
      const split = afId.split('.'); // AutoFormId convention is 'af.object.action'
      const objectName = split[1];
      const actionName = split[2];
      displayMessage('success', actionName + ' ' + objectName + ' ' + 'successful');
    },
  });
};
