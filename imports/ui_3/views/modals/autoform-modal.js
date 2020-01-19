/* global alert */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';

import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { initializeHelpIcons } from '/imports/ui_3/views/blocks/help-icon.js';
import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import './autoform-modal.html';

// How to instantiate an Autoform_modal window: Modal.show('Autoform_modal', afOptions)
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

Template.Autoform_modal.onCreated(function () {
  Session.set('autoformType', this.data.type);
});

Template.Autoform_modal.onRendered(function () {
  const id = afId2details(this.data.id);
  const collection = Factory.get(id.object).collection;
  const schemaName = `schema${collection._name.capitalize()}`;
  initializeHelpIcons(this, schemaName);
});

Template.Autoform_modal.helpers({
  title() {
    if (this.title) return this.title;
    const id = afId2details(this.id);
    if (id.object === 'bill' || id.object === 'receipt') {
      const relation = Session.get('modalContext').txdef.data.relation;
      id.object = relation + '_' + id.object;
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
  debugInfo() {
    if (Meteor.isDevelopment && this.doc) return ` [${this.doc._id}]`;
    return '';
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
      ModalStack.recordResult(afId, result);
      Modal.hide(this.template.parent());
      const id = afId2details(afId);
      const actionNameDone = 'actionDone_' + id.action;
      displayMessage('success', __(id.object) + ' ' + __(actionNameDone));
    },
  });
};
