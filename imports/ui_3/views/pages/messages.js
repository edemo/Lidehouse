import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { $ } from 'meteor/jquery';
import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { update as updateUser } from '/imports/api/users/methods.js';
import '/imports/api/topics/rooms/rooms.js';

import '../components/members-panel.js';
import '../components/contact-long.js';
import './messages.html';

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

Template.Messages.onRendered(function() {
  if ($(window).width() > 768) $('.js-focused').focus();
  messageFooterToBottom();
  $(window).bind("load resize scroll", function() {
    messageFooterToBottom();    
  });
});

Template.Messages.helpers({
  selectedPersonId() {
    return Session.get('messengerPersonId');
  },
  selectedPerson() {
    const selectedPersonId = Session.get('messengerPersonId');
    return Meteor.users.findOne(selectedPersonId);
  },
  selectedPersonRoom() {
    const selectedPersonId = Session.get('messengerPersonId');
    const room = Topics.messengerRoom(Meteor.userId(), selectedPersonId);
    return room;
  },
});

// -------------------- Msg_box ---------------------------

Template.Message_history.onCreated(function tmplMsgBoxOnCreated() {
  this.autorun(() => {
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    if (!room) return;
    this.subscribe('comments.onTopic', { topicId: room._id });
  });   // doesn't need this, ever since MsgBox is only rendered when there is already communication between the users
/*  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
  */
});

Template.Message_history.onRendered(function tmplMsgBoxOnRendered() {
  this.autorun(() => {
    $('.chat-discussion').scrollTop($('.chat-discussion')[0].scrollHeight);
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    if (!room) return;
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
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    return Comments.find({ topicId: room._id }, { sort: { createdAt: 1 } });
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
    let room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    let roomId;
    const insertMessage = () => {
      Meteor.call('comments.insert', {
        topicId: roomId,
        userId: Meteor.userId(),
        text,
      },
      onSuccess((res) => {
        textarea.value = '';
        if ($(window).width() > 768) $('.js-focused').focus();
        Meteor.user().hasNowSeen(roomId, Meteor.users.SEEN_BY_EYES);
      }));
    };
    
    if (room) {
      roomId = room._id;
      insertMessage();
    } else {
      Meteor.call('topics.insert', {
        communityId: Session.get('activeCommunityId'),
        userId: Meteor.userId(),
        participantIds: [Meteor.userId(), Session.get('messengerPersonId')],
        category: 'room',
      }, onSuccess((res) => {
        roomId = res;
        room = Topics.findOne(roomId);
        insertMessage();
      }),
      );
    }
  },
});
