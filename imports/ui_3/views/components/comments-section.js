/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
/* globals Waypoint */

import { __ } from '/imports/localization/i18n.js';
import { displayMessage, onSuccess, handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment, update as updateComment, remove as removeComment } from '/imports/api/comments/methods.js';
import { like } from '/imports/api/topics/likes.js';
import { flag } from '/imports/api/topics/flags.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
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
  commentsOfTopic() {
    const route = FlowRouter.current().route.name;
    const comments = Comments.find({ topicId: this._id.value }, { sort: { createdAt: 1 } });
    if (route === 'Board') {
      // on the board showing only the most recent ones
      return comments.fetch().slice(-1 * RECENT_COMMENT_COUNT);
    }
    return comments;
  },
  hasMoreComments() {
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
    insertComment.call({
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

Template.Comment.helpers({
});

Template.Comment.events({
  'click .js-like'(event) {
    event.preventDefault();
    like.call({
      coll: 'comments',
      id: this._id,
    }, handleError);
  },
  'click .js-flag'(event) {
    event.preventDefault();
    flag.call({
      coll: 'comments',
      id: this._id,
    }, handleError);
  },
  'click .js-edit'(event, instance) {
    $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    const originalText = Comments.findOne({ _id: instance.data._id }).text;
    const textareaEdit = '<span id="editableSpan"><textarea class="form-control js-send-edited">' + 
      originalText + '</textarea>' + `<small class="text-muted">${__('commentEditInstruction')} </small></span>`;
    $(textareaEdit).insertAfter('span[data-id="' + instance.data._id + '"]');
    $('#editableSpan > textarea').focus();
  },
  'keydown .js-send-edited'(event, instance) {
    // pressing escape key
    if (event.keyCode === 27) { 
      event.preventDefault();
      $('#editableSpan').remove();
      $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    }
    // pressing enter key
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      const editedText = $('#editableSpan > textarea').val();
      updateComment.call({
        _id: instance.data._id,
        modifier: { $set: { text: editedText } },
      }, handleError);
      $('#editableSpan').remove();
      $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    }
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeComment, { _id: this._id }, {
      action: 'delete comment',
      message: 'It will disappear forever',
    });
  },
});
