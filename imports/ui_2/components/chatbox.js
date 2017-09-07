import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { __ } from '/imports/localization/i18n.js';
import { Comments } from '/imports/api/comments/comments.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/modal.js';
import '../modals/confirmation.js';
import '../components/chatbox.html';
import '../components/comments-section.js';

Template.Chatbox.onRendered(function chatboxOnRendered() {
});

Template.Chatbox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
  displayTimeSince() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.createdAt).from(serverTimeNow);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
});

Template.Chatbox.events({
  'click .js-edit'(event, instance) {
    // TODO: Make the text field editable, display a send button, when clicked, call updateTopic, hide editable field
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
});
