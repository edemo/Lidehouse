import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { update as updateUser } from '/imports/api/users/methods.js';
import '/imports/api/topics/rooms/rooms.js';

import '../components/members-panel.js';
import '../components/contact-long.js';
import './room-show.html';

function messageFooterToBottom() {
  const windowHeight = $(window).height();
  const topbarHeight = $('nav.navbar-fixed-top').height();
  const titleHeight = $('.messages > .ibox-title').height();
  const footerHeight = $('.messages > .ibox-footer').height();
  const paddings = 70;
  const largeScreenHeight = windowHeight - topbarHeight - titleHeight - footerHeight - (2 * paddings);
  const smallScreenHeight = windowHeight - topbarHeight - titleHeight - footerHeight - paddings;
  if (windowHeight > 700) {
    $('.messages > .ibox-content').css("height", largeScreenHeight + "px");
  } else {
    $('.messages > .ibox-content').css("height", smallScreenHeight + "px");
  }
}

Template.Room_show.onRendered(function() {
  if ($(window).width() > 768) $('.js-focused').focus();
  messageFooterToBottom();
  $(window).bind("load resize scroll", function() {
    messageFooterToBottom();    
  });
});

Template.Room_show.helpers({
  selectedRoomId() {
    return FlowRouter.getParam('_rid');
  },
  selectedRoom() {
    const roomId = FlowRouter.getParam('_rid');
    return Topics.findOne(roomId);
  },
  hasMessages() {
    const roomId = FlowRouter.getParam('_rid');
    const room = Topics.findOne(roomId);
    return !!room.commentCounter;
  },
  selectedPerson() {
    const roomId = FlowRouter.getParam('_rid');
    const room = Topics.findOne(roomId);
    // const participantList = room.participantIds.map(pid => Meteor.users.findOne(pid).toString()).join(' ');
    const otherPersonId = room.participantIds.filter(pid => pid !== Meteor.userId())[0];
    return Meteor.users.findOne(otherPersonId);
  },
});

// -------------------- Msg_box ---------------------------

Template.Message_history.onCreated(function tmplMsgBoxOnCreated() {
  this.autorun(() => {
    // not needed anymore, we are subscribing to this implicitly in main -- 
    // const roomId = FlowRouter.getParam('_rid');
    // this.subscribe('comments.onTopic', { topicId: roomId });
  });
});

Template.Message_history.onRendered(function tmplMsgBoxOnRendered() {
  this.autorun(() => {
    $('.chat-discussion').scrollTop($('.chat-discussion')[0].scrollHeight);
    const roomId = FlowRouter.getParam('_rid');
    const room = Topics.findOne(roomId);
    if (this.subscriptionsReady()) {
      Meteor.user().hasNowSeen(room, Meteor.users.SEEN_BY_EYES);
    }
  });

  $('.full-height-scroll').slimscroll({
    height: '100%',
    start: 'bottom',
  });
});

Template.Message_history.helpers({
  messages() {
    const roomId = FlowRouter.getParam('_rid');
    return Comments.find({ topicId: roomId }, { sort: { createdAt: 1 } });
  },
  ownMessage(comment) {
    return comment.userId === Meteor.userId();
  },
});

// -------------------- Msg_send ---------------------------

Template.Message_send.events({
  'click .js-send'(event, instance) {
    const textarea = instance.find('textarea');
    const text = textarea.value;
    const roomId = FlowRouter.getParam('_rid');
    const room = Topics.findOne(roomId);
    Meteor.call('comments.insert', {
      topicId: roomId,
      userId: Meteor.userId(),
      text,
    },
    onSuccess((res) => {
      Meteor.user().hasNowSeen(room, Meteor.users.SEEN_BY_EYES);
      textarea.value = '';
      if ($(window).width() > 768) $('.js-focused').focus();
    }));
  },
});
