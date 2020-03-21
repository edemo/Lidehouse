import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { feedbacksSchema } from '/imports/api/topics/feedbacks/feedbacks.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { ReactiveVar } from 'meteor/reactive-var';
import { displayError, displayMessage, handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { debugAssert } from '/imports/utils/assert.js';
import '/imports/startup/both/version.js';
import './footer.html';

Template.Footer.onCreated(function () {
  this.version = new ReactiveVar();
  const self = this;
  Meteor.call('version.get', {}, onSuccess(res => self.version.set(res)));
});

Template.Footer.onRendered(function () {
    // FIXED FOOTER
    // Uncomment this if you want to have fixed footer or add 'fixed' class to footer element in html code
    // $('.footer').addClass('fixed');
});

Template.Footer.helpers({
  version() {
    return Template.instance().version.get();
  },
});

AutoForm.addHooks('af.feedback', {
  formToDoc(doc) {
    doc.category = 'feedback';
    doc.title = doc.text ? doc.text.substring(0, 100) : '';
//    if (!doc.feedback) doc.feedback = {};
    return doc;
  },
  onError(formType, error) {
    displayError(error);
  },
  onSuccess(formType, result) {
    displayMessage('success', 'Feedback appreciated');
  },
});
