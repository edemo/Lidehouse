import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { insert as insertTopic } from '/imports/api/topics/methods.js';
import { onSuccess } from '/imports/ui/lib/errors.js';

import './new-forum-topic.html';

Template.New_forum_topic.events({
  'click .js-send'(event) {
    const titlearea = $.find('#new_forum_title')[0];
    const textarea = $.find('#new_forum_text')[0];
    insertTopic.call({
      communityId: Session.get('activeCommunityId'),
      userId: Meteor.userId(),
      category: 'forum',
      title: titlearea.value,
      text: textarea.value,
    }, onSuccess(function (res) { textarea.value = ''; titlearea.value = ''; })
    );
  },
});
