/* global alert window */

// import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { invite } from '../../api/users/methods.js';

import './invite-form.html';

Template.Invite_form.helpers({
});

Template.Invite_form.events({
  'click button'() {
    const email = window.document.getElementById('email').value;
    const userId = invite.call({ email });
  },
});
