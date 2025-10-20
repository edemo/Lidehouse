import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import '/imports/api/users/actions.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './contact-long.html';

Template.Contact_long.viewmodel({
  showDebugInfo: false,
  hasActionButtons() {
    const current = FlowRouter.current();
    if (current?.route?.name === 'Room show') return false
    else return true;
  },
});

Template.Contact_long.events({
  'click .fa-info'(event, instance) {
    instance.viewmodel.showDebugInfo(true);
  },
});
