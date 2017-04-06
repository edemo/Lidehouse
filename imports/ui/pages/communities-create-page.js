/* global alert */

import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';

import './communities-create-page.html';

AutoForm.hooks({
  communities_create: {
    // Called when any submit operation fails
    onError: function onFormError(formType, error) {
      alert(error); // eslint-disable-line no-alert
    },
  },
});

Template.Communities_create_page.helpers({
  communities() {
    return Communities;
  },
});
