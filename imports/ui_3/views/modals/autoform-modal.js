/* global alert */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { getCurrentUserLang } from '/imports/api/users/users.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import './autoform-modal.html';

// How to instantiate an Autoform_modal window: Modal.show('Autoform_modal', afOptions)
// Make sure afOptions you omitFields if it is auto filled in an Autoform.hook

export function afId2details(id) {
  // AutoFormId convention is 'af.object.action'
  const split = id.split('.');
  const entity = split[1];
  const action = split[2];
  return { entity, action };
}

export function details2afId(details) {
  return `af.${details.entity}.${details.action}`;
}

Template.Autoform_modal.viewmodel({
  showDebugInfo: false,
  onCreated(instance) {
    ModalStack.setVar('autoformType', instance.data.type);
    instance.data.onCreated?.();
  },
  onRendered(instance) {
    instance.data.onRendered?.(instance);
  },
  title() {
    const data = this.templateInstance.data;
    if (data.title) return data.title;
    const id = afId2details(data.id);
    if (id.action === 'statusChange') {
      id.entity = 'statusChange';
      id.action = 'create';
    }
    let entityName = __(`entities.${id.entity}.label`);
    if (_.contains(Transactions.categoryValues, id.entity)) {
      const defId = Template.instance().data.doc.defId;
      const txdef = Txdefs.findOne(defId);
      entityName = __(txdef.name);
    }
    if (id.action === 'create') return __('new') + ' ' + entityName + ' ' + __('insertion');
    else {
      if (getCurrentUserLang() === 'en') return __(`actions.${id.action}.do`) + ' ' + entityName;
      else return entityName + ' ' + __(`actions.${id.action}.doing`);
    }
  },
  debugInfo() {
    const data = this.templateInstance.data;
    return data?.doc?._id;
  },
});

Template.Autoform_modal.events({
  'click .fa-info'(event, instance) {
    instance.viewmodel.showDebugInfo(true);
  },
});

AutoForm.addModalHooks = function AutoFormAddModalHooks(afId) {
  AutoForm.addHooks(afId, {
    onError(formType, error) {
      // const errorMessage = __('errorInFormFieldValidation');
      // error.message = errorMessage + '\n' + error.message;
      displayError(error);
      if (error.error === 'invocation-failed') Modal.hide(this.template.parent());
    },
    onSuccess(formType, result) {
      ModalStack.recordResult(afId, result);
      Modal.hide(this.template.parent());
      const id = afId2details(afId);
      const successMessage = __(`entities.${id.entity}.label`) + ' ' + __(`actions.${id.action}.done`);
      displayMessage('success', successMessage.capitalize());
//      const callback = ModalStack.getCallback();
//      if (callback) Meteor.timeout(() => Meteor.call(callback.method, callback.params), 500);
    },
  });
};
