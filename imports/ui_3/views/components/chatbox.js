import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { __ } from '/imports/localization/i18n.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from '/imports/api/topics/topics.js';
import { like } from '/imports/api/topics/likes.js';
import { flag } from '/imports/api/topics/flags.js';
import { block } from '/imports/api/users/methods.js';
import { remove as removeTopic, update as updateTopic } from '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '../components/chatbox.html';
import '../components/comments-section.js';

Template.Chatbox.onRendered(function chatboxOnRendered() {
});

Template.Chatbox.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  hiddenBy() {
    if (Meteor.user().hasBlocked(this.createdBy()._id)) {
      return 'you';
    }
    return this.flaggedBy();
  },
});

function toggleFinishEditButtons(instance) {
  $('.js-save-edited[data-id="' + instance.data._id + '"]').toggleClass('hidden');
  $('.js-cancel[data-id="' + instance.data._id + '"]').toggleClass('hidden');
};
function toggleTopic(instance) {
  $('p[data-id="' + instance.data._id + '"]').toggleClass('hidden');
  $('strong[data-id="' + instance.data._id + '"]').toggleClass('hidden');
};
function finishEditing(instance) {
  $('.js-text[data-id="' + instance.data._id + '"]').remove();
  $('.js-title[data-id="' + instance.data._id + '"]').remove();
  toggleFinishEditButtons(instance);
  toggleTopic(instance);
};

Template.Chatbox.events({
  'click .js-edit-topic'(event, instance) {
    const originalText = Topics.findOne({ _id: instance.data._id }).text;
    const originalTitle = Topics.findOne({ _id: instance.data._id }).title;
    const textareaText = '<textarea data-id="' + instance.data._id + '" rows="3" cols="" class="js-text full-width">' + originalText + '</textarea>';
    const textareaTitle = '<textarea data-id="' + instance.data._id + '" class="js-title" rows="1" cols="">' + originalTitle + '</textarea>';
    $(textareaTitle).insertAfter('strong[data-id="' + instance.data._id + '"]');
    $(textareaText).insertAfter('p[data-id="' + instance.data._id + '"]');
    toggleTopic(instance);
    toggleFinishEditButtons(instance);
  },
  'click .js-save-edited'(event, instance) {
    const editedText = $('.js-text[data-id="' + instance.data._id + '"]').val();
    const editedTitle = $('.js-title[data-id="' + instance.data._id + '"]').val() || editedText.substring(0, 25) + '...';
    updateTopic.call({
      _id: instance.data._id,
      modifier: { $set: { text: editedText, title: editedTitle } },
    });
    finishEditing(instance);
  },
  'click .js-cancel'(event, instance) {
    finishEditing(instance);
  },
  'keydown .js-text'(event, instance) {
    // pressing escape key
    if (event.keyCode === 27) { 
      event.preventDefault();
      finishEditing(instance);
    }
  },
  'keydown .js-title'(event, instance) {
    // pressing escape key
    if (event.keyCode === 27) { 
      event.preventDefault();
      finishEditing(instance);
    }
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeTopic, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
  'click .js-block'(event, instance) {
    block.call({
      blockedUserId: instance.data.userId,
    }, handleError);
  },
  'click .js-report'(event, instance) {
    flag.call({
      coll: 'topics',
      id: this._id,
    }, handleError);
  },
  'click .social-body .js-like'(event) {
    like.call({
      coll: 'topics',
      id: this._id,
    }, handleError);
  },
});
