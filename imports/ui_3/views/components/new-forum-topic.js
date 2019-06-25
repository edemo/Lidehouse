import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';

import './new-forum-topic.html';

Template.New_forum_topic.events({
  'input #new_forum_text'(event) {
    if (event.target.value === '') {
      $(event.target).closest('.media').find('.js-send').addClass('disabled');
    } else {
      $(event.target).closest('.media').find('.js-send').removeClass('disabled');
    }
  },
  'click .js-send'(event) {
    if ($(event.target).hasClass('disabled')) return;
    const titlearea = $.find('#new_forum_title')[0];
    const textarea = $.find('#new_forum_text')[0];
    if (!titlearea.value) {
      titlearea.value = textarea.value.substring(0, 25) + '...';
    }
    Topics.methods.insert.call({
      communityId: Session.get('activeCommunityId'),
      userId: Meteor.userId(),
      category: 'forum',
      title: titlearea.value,
      text: textarea.value,
      status: 'opened',
    }, onSuccess(function (res) { textarea.value = ''; titlearea.value = ''; $(event.target).addClass('disabled'); })
    );
  },
});
