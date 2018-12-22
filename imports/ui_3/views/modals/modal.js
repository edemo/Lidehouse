import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import './modal.html';

Template.Modal.events({
  'click #btn-ok'(event, instance) {
    if (instance.data.onOK) instance.data.onOK.call();
  },
  'click #btn-close'(event, instance) {
    if (instance.data.onClose) instance.data.onClose.call();
  },
});
