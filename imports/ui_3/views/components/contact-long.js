import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import '/imports/api/users/actions.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './contact-long.html';

Template.Contact_long.viewmodel({
  showDebugInfo: false,
});

Template.Contact_long.events({
  'click .fa-info'(event, instance) {
    instance.viewmodel.showDebugInfo(true);
  },
});
