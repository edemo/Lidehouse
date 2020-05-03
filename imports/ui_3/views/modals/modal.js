import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import '/imports/ui_3/views/modals/modal-guard.js';
import './modal.html';

Template.Modal.viewmodel({
  share: 'import',
});

Template.Modal.events({
  'click #btn-ok'(event, instance) {
    if (instance.data.onOK) instance.data.onOK.call(instance.viewmodel);
  },
  'click #btn-action'(event, instance) {
    if (instance.data.onAction) instance.data.onAction.call(instance.viewmodel);
  },
  'click #btn-close'(event, instance) {
    if (instance.data.onClose) instance.data.onClose.call(instance.viewmodel);
  },
});
