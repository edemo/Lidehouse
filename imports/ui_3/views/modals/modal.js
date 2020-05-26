import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import { handleError, displayError } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/modals/modal-guard.js';
import './modal.html';

Template.Modal.viewmodel({
  share: 'import',
});

Template.Modal.events({
  'click #btn-ok'(event, instance) {
    if (instance.data.onOK) {
      try {
        instance.data.onOK.call(instance.viewmodel);
      } catch (err) { displayError(err); }
    }
  },
  'click #btn-close'(event, instance) {
    if (instance.data.onClose) {
      try {
        instance.data.onClose.call(instance.viewmodel);
      } catch (err) { displayError(err); }
    }
  },
});
