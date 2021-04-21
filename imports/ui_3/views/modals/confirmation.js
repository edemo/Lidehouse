import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal-guard.js';

import './confirmation.html';

Template.Confirmation.helpers({
  okButtonText(action) {
    if (action === 'delete') return __('actions.delete.label');
    return __('ok');
  },
});

Template.Confirmation.events({
  'click #btn-ok'(event, instance) {
    instance.data.onOK.call();
  },
  'click #btn-cancel'(event, instance) {
    instance.data.onCancel.call();
  },
});

Modal.confirmAndCall = function ModalConfirmAndCall(method, params, options, callback) {
  const successMessage = options.notification ||
    __(`entities.${options.entity}.label`) + ' ' + __(`actions.${options.action}.done`);
  Modal.show('Confirmation', _.extend({}, options, {
    onOK() {
      method.call(params, function handler(err, res) {
        if (err) {
          Modal.hide();
          displayError(err);
        } else {
          Modal.hide();
          displayMessage('success', successMessage.capitalize());
          if (callback) callback(true, res);
        }
      });
    },
    onCancel() {
      if (callback) callback(false);
    },
  }));
};
