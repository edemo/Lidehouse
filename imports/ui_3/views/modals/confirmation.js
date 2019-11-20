import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/multi-modal-handler.js';

import './confirmation.html';

Template.Confirmation.events({
  'click #btn-ok'(event, instance) {
    instance.data.onOK.call();
  },
});

Modal.confirmAndCall = function ModalConfirmAndCall(method, params, options) {
  Modal.show('Confirmation', {
    action: options.action,
    body: (options.message || ''),
    onOK() {
      method.call(params, function handler(err, res) {
        if (err) {
          Modal.hide();
          displayError(err);
        } else {
          Modal.hide();
          displayMessage('success', options.notification || `${options.action} successful`);
        }
      });
    },
  });
};
