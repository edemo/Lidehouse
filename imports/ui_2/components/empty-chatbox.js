import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { insert as insertTopic } from '/imports/api/topics/methods.js';
import { displayError } from '/imports/ui/lib/errors.js';

import './empty-chatbox.html';

Template.Empty_chatbox.events({
  'click .btn-comment'(event) {
    insertTopic.call({
      communityId: Session.get('activeCommunityId'),
      userId: Meteor.userId(),
      category: 'forum',
      title: 'undefined',
      text: event.target.previousElementSibling.value,
    }, function handle(err) {
      if (err) {
        displayError(err);
        return;
      }
    });
    event.target.previousElementSibling.value = '';
  },
});
