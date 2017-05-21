/* global alert window */

// import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { displayError } from '/imports/ui/lib/errors.js';
import { invite } from '../../api/users/methods.js';

import './invite-form.html';

Template.Invite_form.helpers({
});

Template.Invite_form.events({
  'click button'() {
    const communityId = Session.get('activeCommunity')._id;
    if (!communityId) {
      alert('No active community selected.');
      return;
    }
    const email = window.document.getElementById('email').value;
    /* const userId = */ invite.call({ email, communityId }, displayError);
  },
});
