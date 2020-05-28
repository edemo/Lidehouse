/* globals document Waypoint */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { __ } from '/imports/localization/i18n.js';
import { displayError, handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/comments/methods.js';
import '/imports/api/comments/actions.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './comments-section.html';

Template.Comments_section.onRendered(function chatboxOnRendered() {
  this.waypoint = new Waypoint({
    element: this.find('.comment-section'),
    handler() {
      const topicId = this.element.dataset.id;
      // displayMessage('info', `You just seen ${topicId}`); // debug
      Meteor.user().hasNowSeen(topicId);
    },
    offset: '80%',
  });
  // Above is nicer syntax , but requires bigu:jquery-waypoints https://stackoverflow.com/questions/28975693/using-jquery-waypoints-in-meteor
  /* this.waypoint = this.$('.comment-section').waypoint(function (direction) {
    displayMessage('info', `You just seen ${this.dataset.id}`); // debug
  }, {
    offset: '80%',
  });*/
});

Template.Comments_section.onDestroyed(function chatboxOnDestroyed() {
  this.waypoint.destroy();
});

const RECENT_COMMENT_COUNT = 5;

Template.Comments_section.viewmodel({
  commentText: '',
  draft: '',
  isVote() {
    const topic = this.templateInstance.data;
    return topic.category === 'vote';
  },
  eventsOfTopic() {
    const route = FlowRouter.current().route.name;
    const events = Comments.find({ topicId: this._id.value }, { sort: { createdAt: 1 } });
    if (route === 'Board') {
      // on the board showing only the most recent ones
      return events.fetch().slice(-1 * RECENT_COMMENT_COUNT);
    }
    return events;
  },
  hasMoreEvents() {
    const route = FlowRouter.current().route.name;
    return (route === 'Board' && this.commentCounter.value > RECENT_COMMENT_COUNT)
      ? this.commentCounter.value - RECENT_COMMENT_COUNT
      : 0;
  },
});

Template.Comments_section.events({
  'click .social-comment .js-attach'(event, instance) {
    const vm = instance.viewmodel;
    const doc = {
      topicId: this._id,
      text: instance.viewmodel.commentText(),
    };
    const options = {};
    Object.setPrototypeOf(options, new ActionOptions(Comments));
    Comments.actions.new(options, doc).run(event, instance);
    vm.commentText('');
  },
  'click .social-comment .js-send'(event, instance) {
    const vm = instance.viewmodel;
    vm.draft(vm.commentText());
    vm.commentText('');
    Comments.methods.insert.call({
      topicId: this._id,
      text: vm.draft(),
    }, (err) => {
      if (err) {
        vm.commentText(vm.draft());
        displayError(err);
      }
    });
  },
});

//------------------------------------

Template.Comment.viewmodel({
  editing: false,
});

Template.Comment.events({
  'click .js-like'(event, instance) {
    Comments.actions.like({}, this).run();
  },
  'click .js-edit'(event, instance) {
    const element = $(event.target).closest('.media-body');
    Meteor.setTimeout(() => element.find('textarea')[0].focus(), 100);
    instance.viewmodel.editing(true);
  },
  'click .js-save'(event, instance) {
    const text = $(event.target).closest('.media-body').find('textarea')[0].value;
    Comments.methods.update.call({
      _id: instance.data._id,
      modifier: { $set: { text } },
    }, handleError);
    instance.viewmodel.editing(false);
  },
  'click .js-cancel'(event, instance) {
    instance.viewmodel.editing(false);
  },
  'keydown textarea'(event, instance) {
    if (event.keyCode === 27) {
      instance.viewmodel.editing(false);
    }
  },
});

