import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import './autoform-edit.html';

// How to instantiate an Autoform_edit window: Modal.show('Autoform_edit', afOptions)
// Make sure afOptions you omitFields if it is auto filled in an Autoform.hook

Template.Autoform_edit.helpers({
  title() {
    return this.title || 'editing data';
  },
});

AutoForm.addModalHooks = function AutoFormAddModalHooks(afId) {
  AutoForm.addHooks(afId, {
    onError(formType, error) {
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
