/* global alert */

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import './users-show-form.html';
import '../../api/users/users.js';

Template.Users_show_form.onCreated(function usersShowPageOnCreated() {
  this.getUserId = () => FlowRouter.getParam('_id');

  this.autorun(() => {
    this.subscribe('users.byId', { _id: this.getUserId() });
  });
});

Template.Users_show_form.helpers({
  users() {
    return Meteor.users;
  },
  document() {
    return Meteor.users.findOne({ _id: FlowRouter.getParam('_id') });
  },
  schema() {
    return new SimpleSchema([
      { email: { type: String, regEx: SimpleSchema.RegEx.Email } },
      Meteor.users.simpleSchema(),
    ]);
  },
});

AutoForm.addHooks('af.user.update', {
  docToForm(doc) {
    doc.email = doc.emails[0].address;
    Session.set('userEmailAddress', doc.email);
    return doc;
  },
  formToModifier(modifier) {
    if (modifier.$set.email !== Session.get('userEmailAddress')) {        // The user has changed her email address
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
  onError(formType, error) {    // Called when any submit operation fails
    alert(error); // eslint-disable-line no-alert
  },
});
