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

export function afId2details(id) {
  // AutoFormId convention is 'af.object.action'
  const split = id.split('.');
  const object = split[1];
  const action = split[2];
  return { object, action };
}

export function details2afId(details) {
  return `af.${details.object}.${details.action}`;
}

Template.Autoform_edit.onCreated(function () {
  Session.set('autoformType', this.data.type);
});

Template.Autoform_edit.onRendered(function () {
  const id = afId2details(this.data.id);
  const collection = Factory.get(id.object).collection;
  const schemaName = `schema${collection._name.capitalize()}`;
  initializeHelpIcons(this, schemaName);
});

Template.Autoform_edit.helpers({
  title() {
    if (this.title) return this.title;
    const id = afId2details(this.id);
    if (id.object === 'transaction' && id.action === 'insert') {
      id.object = TxCats.findOne(Session.get('activeTxCatId')).name;
    }
    if (id.action === 'statusChange') {
      id.object = 'statusChange';
      id.action = 'insert';
    }
    if (id.action === 'insert') return __('new') + ' ' + __(id.object) + ' ' + __('insertion');
    else if (id.action === 'update') return __(id.object) + ' ' + __('editing data');
    else if (id.action === 'view') return __(id.object) + ' ' + __('viewing data');
    else return __(id.object) + ' ' + __(id.action);
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
      const id = afId2details(afId);
      const actionNameDone = 'actionDone_' + id.action;
      displayMessage('success', __(id.object) + ' ' + __(actionNameDone));
    },
  });
};
