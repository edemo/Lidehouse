/* global alert */

import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import './communities-create.html';

Template.Communities_create_form.helpers({
  communities() {
    return Communities;
  },
});

AutoForm.hooks({
  afCommunitiesCreate: {
    onError: function onFormError(formType, error) {
      displayError(error);
    },
    onSuccess: function onFormSuccess(formType, result) {
      displayMessage('success', 'Created community');
    },
  },
});
