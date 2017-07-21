import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import './autoform-edit.html';

const __ = TAPi18n.__;

Template.Autoform_edit.helpers({
});

AutoForm.addModalHooks = function AutoFormAddModalHooks(afId) {
  AutoForm.addHooks(afId, {
    onError(formType, error) {
      displayError(error);
    },
    onSuccess(formType, result) {
      Modal.hide();
      const actionName = afId.substring(2); // AutoFormId convention is 'afActionName'
      displayMessage('success', __(actionName) + ' ' + __('successful'));
    },
  });
};
