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
  afModalInserter: {
    formToDoc(doc) {
      doc.communityId = Session.get('activeCommunityId');
      return doc;
    },
    onError(formType, error) {
      displayError(error);
    },
    onSuccess(formType, result) {
      Modal.hide();
      displayMessage('success', 'Insert successful');
    },
  },

  afModalUpdater: {
    onError(formType, error) {
      displayError(error);
    },
    onSuccess(formType, result) {
      Modal.hide();
      displayMessage('success', 'Edit successful');
    },
  },
});
