import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { insert as insertTopic } from '/imports/api/topics/methods.js';
import { onSuccess } from '/imports/ui/lib/errors.js';

import './empty-chatbox.html';

Template.Empty_chatbox.events({
  'keyup .js-send-enter'(event) {
    if (event.keyCode !== 13) return;
    const textarea = event.target;
    insertTopic.call({
      communityId: Session.get('activeCommunityId'),
      userId: Meteor.userId(),
      category: 'forum',
      title: 'undefined',
      text: textarea.value,
    }, onSuccess(res => textarea.value = '')
    );
  },
});
