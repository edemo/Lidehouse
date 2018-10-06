import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import './modal.html';

Template.Modal.events({
  'click #btn-ok'(event, instance) {
    instance.data.onOK.call();
  },
});
