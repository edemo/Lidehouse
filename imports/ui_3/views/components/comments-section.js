/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
/* globals Waypoint */

import { Topics } from '/imports/api/topics/topics.js';
import { __ } from '/imports/localization/i18n.js';
import { displayMessage, onSuccess, handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/comments/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    // not needed any more, we subscribe to all comments in main now
    // this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
});

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
    const comments = Comments.find({ topicId: this._id.value });
    return (route === 'Board' && comments.count() > RECENT_COMMENT_COUNT)
      ? comments.count() - RECENT_COMMENT_COUNT
      : 0;
  },
});

Template.Comments_section.events({
 /* 'keydown .js-send-enter'(event) {
    const topicId = this._id;
    const userId = Meteor.userId();
    if (event.keyCode === 13 && !event.shiftKey) {
      const textarea = event.target;
      insertComment.call({ topicId, userId, text: textarea.value },
        onSuccess((res) => {
          textarea.value = '';
        })
      );
    }
  },*/
  'click .social-comment .js-send'(event, instance) {
    // if ($(event.target).hasClass('disabled')) return;
    const textarea = $(event.target).closest('.media-body').find('textarea')[0];
    Comments.methods.insert.call({
      topicId: this._id,
      userId: Meteor.userId(),
      text: textarea.value,
    },
    onSuccess((res) => {
      textarea.value = '';
      instance.viewmodel.commentText('');
      // $(event.target).addClass('disabled');
    }));
  },
});

//------------------------------------

Template.Comment.viewmodel({
  editing: false,
});

Template.Comment.events({
  'click .js-like'(event) {
    event.preventDefault();
    Comments.methods.like.call({ id: this._id }, handleError);
  },
  'click .js-flag'(event) {
    event.preventDefault();
    Comments.methods.flag.call({ id: this._id }, handleError);
  },
  'click .js-edit'(event, instance) {
    const element = $(event.target).closest('.media-body');
    Meteor.setTimeout(() => element.find('textarea')[0].focus(), 100);
    instance.viewmodel.editing(true);
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(Comments.methods.remove, { _id: this._id }, {
      action: 'delete comment',
      message: 'It will disappear forever',
    });
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
