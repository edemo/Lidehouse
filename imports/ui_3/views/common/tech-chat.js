import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Communities } from '/imports/api/communities/communities.js';

import './tech-chat.html';

function getMyTechSupportRoom() {
  const communityId = Session.get('activeCommunityId');
  return Topics.findOne({ communityId, category: 'room', title: 'tech support', userId: Meteor.userId() });
}

Template.Tech_chat.onCreated(function tehcChatOnCreated() {
  this.autorun(() => {
    /* not needed any more, we subscribe to all comments in main now
    const room = getMyTechSupportRoom();
    if (room) {
      this.subscribe('comments.onTopic', { topicId: room._id });
    } */
  });
});

Template.Tech_chat.onRendered(function() {
  // Initialize slimscroll for small chat
  $('.small-chat-box .content').slimScroll({
    height: '234px',
    railOpacity: 0.4,
    start: 'bottom',
  });
});

Template.Tech_chat.helpers({
  messages() {
    const room = getMyTechSupportRoom();
    if (!room) return [];
    return Comments.find({ topicId: room._id });
  },
  hasUnreadMessages() {
    const room = getMyTechSupportRoom();
    if (!room) return false;
    return room.unseenCommentCountBy(Meteor.userId(), Meteor.users.SEEN_BY.EYES) > 0;
  },
  unreadMessagesCount() {
    const room = getMyTechSupportRoom();
    if (!room) return 0;
    return room.unseenCommentCountBy(Meteor.userId(), Meteor.users.SEEN_BY.EYES);
  },
  sideOfMessage(userId) {
    if (userId === Meteor.userId()) return 'right';
    return 'left';
  },
  authorStyle(userId) {
    if (userId !== Meteor.userId()) return 'active';
    return '';
  },
  questioner(userId) {
    if (userId === Meteor.userId()) return true;
    return false;
  }
});

Template.Tech_chat.events({
  // Toggle left navigation
  'click .open-small-chat'(event) {
    event.preventDefault();
    $(event.target).closest('a').children().toggleClass('fa-question').toggleClass('fa-times');
    $('.small-chat-box').toggleClass('active');
    const room = getMyTechSupportRoom();
    if (room) Meteor.user().hasNowSeen(room._id);
    $('.small-chat-box .content').slimScroll({ scrollTo: ($('.small-chat-box .content')[0].scrollHeight) });
    $('.small-chat-box .slimScrollBar').css('top', '234px');
  },
  'click .small-chat-box .js-send'(event, instance) {
    const textarea = instance.find('input');
    const text = textarea.value;
    const communityId = Session.get('activeCommunityId');
    const community = Communities.findOne(communityId);
    const room = getMyTechSupportRoom();
    let roomId;
    const insertMessage = () => {
      Meteor.call('comments.insert', {
        communityId,
        topicId: roomId,
        userId: Meteor.userId(),
        text,
      },
      onSuccess((res) => {
        textarea.value = '';
        $('.small-chat-box .content').slimScroll({ scrollTo: ($('.small-chat-box .content')[0].scrollHeight) });
        $('.small-chat-box .slimScrollBar').css('top', '234px'); 
        // if ($(window).width() > 768) $('.js-focused').focus();
      }));
    };

    if (room) {
      roomId = room._id;
      insertMessage();
    } else {
      // Create my tech support room
      Meteor.call('topics.insert', {
        communityId,
        userId: Meteor.userId(),
        participantIds: [Meteor.userId(), community.techsupport()._id],
        category: 'room',
        title: 'tech support',
      }, onSuccess((res) => {
        roomId = res;
        insertMessage();
      }),
      );
    }
  },
});
