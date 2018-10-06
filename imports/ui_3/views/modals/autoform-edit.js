/* global alert */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import './autoform-edit.html';

// How to instantiate an Autoform_edit window: Modal.show('Autoform_edit', afOptions)
// Make sure afOptions you omitFields if it is auto filled in an Autoform.hook

Template.Autoform_edit.helpers({
  title() {
    if (this.title) return this.title;
    const split = this.id.split('.'); // AutoFormId convention is 'af.object.action'
    const objectName = split[1];
    const actionName = split[2];
    if (actionName === 'insert') return __('new') + ' ' + __(objectName) + ' ' + __('insertion');
    else if (actionName === 'update') return __(objectName) + ' ' + __('editing data');
    else if (actionName === 'view') return __(objectName) + ' ' + __('viewing data');
    else return 'data';
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
      Modal.hide();
      const split = afId.split('.'); // AutoFormId convention is 'af.object.action'
      const objectName = split[1];
      const actionName = split[2];
      displayMessage('success', actionName + ' ' + objectName + ' ' + 'successful');
    },
  });
};
