import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { __ } from '/imports/localization/i18n.js';
import { handleError } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { like } from '/imports/api/topics/likes.js';
import { remove as removeTopic, update as updateTopic } from '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_2/modals/modal.js';
import '/imports/ui_2/modals/confirmation.js';
import '../components/chatbox.html';
import '../components/comments-section.js';

Template.Chatbox.onRendered(function chatboxOnRendered() {
});

Template.Chatbox.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
});

Template.Chatbox.events({
  'click .js-edit-topic'(event, instance) {
    const textP = $('p[data-id="' + instance.data._id + '"]');
    const title = $('strong[data-id="' + instance.data._id + '"]');
    $(textP).replaceWith('<textarea id="textareaEditText" rows="3" cols="" class="full-width">' + textP.text() + '</textarea>');
    $(title).replaceWith('<textarea id="textareaEditTitle" rows="1" cols="">' + title.text() + '</textarea>');
    $('.js-save-edited[data-id="' + instance.data._id + '"]').toggleClass('hidden');
  },
  'click .js-save-edited'(event, instance) {
    const editedText = $('#textareaEditText').val();
    const editedTitle = $('#textareaEditTitle').val() || editedText.substring(0, 25) + '...';
    updateTopic.call({
      _id: instance.data._id,
      modifier: { $set: { text: editedText, title: editedTitle } },
    });
    $('#textareaEditText').replaceWith('<p data-id="' + instance.data._id + '">' + editedText + '</p>');
    $('#textareaEditTitle').replaceWith('<strong data-id="' + instance.data._id + '">' + editedTitle + '</strong>');
    $('.js-save-edited[data-id="' + instance.data._id + '"]').toggleClass('hidden');
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeTopic, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
  'click .js-hide'(event, instance) {
    const modalContext = {
      title: __('Not implemented yet'),
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
  'click .js-report'(event, instance) {
    const modalContext = {
      title: __('Not implemented yet'),
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
  'click .social-body .js-like'(event) {
    like.call({
      coll: 'topics',
      id: this._id,
    }, handleError);
  },
});
