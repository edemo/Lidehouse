import { feedbacksSchema } from '/imports/api/topics/feedbacks/feedbacks.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { debugAssert } from '/imports/utils/assert.js';
import './footer.html';

Template.Footer.onRendered(function () {
    // FIXED FOOTER
    // Uncomment this if you want to have fixed footer or add 'fixed' class to footer element in html code
    // $('.footer').addClass('fixed');
});

AutoForm.addHooks('af.feedback', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
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
