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
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
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

Template.Autoform_modal.viewmodel({
  showDebugInfo: false,
  onCreated(instance) {
    ModalStack.setVar('autoformType', instance.data.type);
    instance.data.onCreated?.();
  },
  onRendered(instance) {
    instance.data.onRendered?.();
  },
  title() {
    const data = this.templateInstance.data;
    if (data.title) return data.title;
    const id = afId2details(data.id);
    if (_.contains(Transactions.categoryValues, id.object)) {
      const defId = Template.instance().data.doc.defId;
      const txdef = Txdefs.findOne(defId);
      id.object = txdef.name;
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
    },
    onSuccess(formType, result) {
      ModalStack.recordResult(afId, result);
      Modal.hide(this.template.parent());
      const id = afId2details(afId);
      const actionNameDone = 'actionDone_' + id.action;
      displayMessage('success', __(id.object) + ' ' + __(actionNameDone));
//      const callback = ModalStack.getCallback();
//      if (callback) Meteor.timeout(() => Meteor.call(callback.method, callback.params), 500);
    },
  });
};
