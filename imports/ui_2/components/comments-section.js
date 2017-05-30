import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Comments } from '/imports/api/comments/comments.js';

import '../components/comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data.topicId });
  });
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
  displayTimeSince() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.createdAt).from(serverTimeNow);
  },
});

Template.Comments_section.events({
  'click .accordion-comment'(event, instance) {
    instance.autorun(() => {
      const accordion = event.target;
      accordion.classList.toggle('active');
      const content = accordion.nextElementSibling;
      const parentAccordion = event.target.closest('.accordion-content');
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = 'unset';
        parentAccordion.style.maxHeight = 'auto';
        // TODO: if content.scrollHeight changes, we need to rerun this
        // so content.scrollHeight changes need to trigger this autorun block
        // so content.scrollHeigh might need to be in a ReactiveVar
      }
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
