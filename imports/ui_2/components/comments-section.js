import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Comments } from '/imports/api/comments/comments.js';

import '../components/comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
});

Template.Comments_section.helpers({
  count() {
    return Comments.find({ topicId: this.topicId }).count();
  },
  comments() {
    return Comments.find({ topicId: this.topicId });
  },
  selfAvatar() {
    return Meteor.user().avatar;
  },
});

Template.Comment.helpers({
  avatar() {
    return this.user().avatar;
  },
  displayUser() {
    return this.user().fullName();
  },
  displaySince() {
    return "3 ora 6 perce";
  },
});

Template.Comments_section.events({
  'click .accordion-comment'(event, instance) {
    instance.autorun(() => {
      const accordion = event.target;
      accordion.classList.toggle('active');
      const content = accordion.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        // TODO: if content.scrollHeight changes, we need to rerun this
        // so content.scrollHeight changes need to trigger this autorun block
        // so content.scrollHeigh might need to be in a ReactiveVar
      }
    });
    // Once its open, we need to subscribe to the comments
    instance.autorun(() => {
      instance.subscribe('comments.onTopic', { topicId: this.topicId });
    });
  },
  'click .js-send-comment'(event) {
    Meteor.call('comments.insert', {
      topicId: this.topicId,
      userId: Meteor.userId(),
      text: event.target.previousElementSibling.value,
    });
    event.target.previousElementSibling.value = '';
  },
});
