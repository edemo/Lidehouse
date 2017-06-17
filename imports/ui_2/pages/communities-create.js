/* global alert */

import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import './communities-create.html';

AutoForm.hooks({
  communities_create: {
    // Called when any submit operation fails
    onError: function onFormError(formType, error) {
      alert(error); // eslint-disable-line no-alert
    },
    onSuccess: function onFormSuccess(formType, result) {
      displayMessage('success', 'Created community');
    },
  },
});

Template.Communities_create_form.helpers({
  communities() {
    return Communities;
  },
});
