import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';

import './autoform-edit.html';

Template.Autoform_edit.helpers({
});

AutoForm.hooks({
  afModalUpdater: {
    onError: function onFormError(formType, error) {
      displayError(error);
    },
    onSuccess: function onFormSuccess(formType, result) {
      Modal.hide();
      displayMessage('success', 'Edit succesful');
    },
  },
});
