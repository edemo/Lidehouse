/* global alert */

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { remove as removeUser } from '/imports/api/users/methods.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/api/users/users.js';
import './profile-form.html';

Template.Profile_form.onCreated(function usersShowPageOnCreated() {
  this.getUserId = () => Meteor.userId();
});

Template.Profile_form.helpers({
  users() {
    return Meteor.users;
  },
  document() {
    return Meteor.users.findOne({ _id: Template.instance().getUserId() });
  },
  schema() {
    return new SimpleSchema([
      { email: { type: String, regEx: SimpleSchema.RegEx.Email, autoform: { disabled: true } } },
      Meteor.users.simpleSchema(),
    ]);
  },
});

Template.Profile_form.events({
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeUser, { _id: Meteor.userId() }, {
      action: 'delete user',
      message: 'deleteUserWarning',
    });
  },
});

AutoForm.addHooks('af.user.update', {
  docToForm(doc) {
    doc.email = doc.emails ? doc.emails[0].address : doc.email; // Autoform tries to retain doc values after a "hot code push"
    Session.set('userEmailAddress', doc.email);
    return doc;
  },
  formToModifier(modifier) {
    if (modifier.$set.email && modifier.$set.email !== Session.get('userEmailAddress')) {        // The user has changed her email address
      // TODO: Should check if email already exist in the system
      modifier.$set.emails = [];
      modifier.$set.emails.push({});
      modifier.$set.emails[0].address = modifier.$set.email;
      modifier.$set.emails[0].verified = false;
      // TODO: A verification email has to be sent to the user now
    }
    delete modifier.$set.email;
    // console.log(`modifier: ${JSON.stringify(modifier)}`);
    return modifier;
  },
  onError(formType, error) {
    displayError(error);
  },
  onSuccess(formType, result) {
    displayMessage('success', 'update user successful');
  },
});
