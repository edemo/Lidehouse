import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/topics/rooms/rooms.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Deals } from '/imports/api/marketplace/deals/deals.js';
import '/imports/api/marketplace/deals/actions.js';
import '../blocks/chopped.js';
import '../components/members-panel.js';
import '../components/contact-long.js';
import '../components/listing-box.js';
import './room-show.html';

function messageFooterToBottom() {
  const windowHeight = $(window).height();
  const topbarHeight = $('nav.navbar-fixed-top').height();
  const titleHeight = $('.messages > .ibox-title').height();
  const footerHeight = $('.messages > .ibox-footer').height();
  const paddings = 80;
  const baseHeight = windowHeight - topbarHeight - titleHeight - footerHeight;
  const largeScreenHeight = baseHeight - (2 * paddings);
  const smallScreenHeight = baseHeight - paddings;
  const chatArea = $('.messages > .ibox-content');
  if (windowHeight > 700) {
    chatArea.css('height', largeScreenHeight + 'px');
  } else {
    chatArea.css('height', smallScreenHeight + 'px');
  }
}

Template.Room_show.onCreated(function tmplMsgBoxOnCreated() {
  this.autorun(() => {
    // this is needed for comments
    const roomId = FlowRouter.getParam('_rid');
    this.subscribe('topics.byId', { _id: roomId });
  });
});

Template.Room_show.onRendered(function() {
  if ($(window).width() > 768) $('.js-focused').focus();
  messageFooterToBottom();
  $(window).bind("load resize scroll", function() {
    messageFooterToBottom();    
  });
});

Template.Room_show.viewmodel({
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
    // const participantList = room.participantIds.map(pid => Meteor.users.findOne(pid).displayOfficialName()).join(' ');
    const otherPersonId = room.participantIds.filter(pid => pid !== Meteor.userId())[0];
    return Meteor.users.findOne(otherPersonId);
  },
  selectedDeal() {
    const roomId = FlowRouter.getParam('_rid');
    const deal = Deals.findOne({ roomId });
    return deal;
  },
  selectedListing() {
    const deal = this.selectedDeal();
    const listing = deal?.listing();
    return listing;
  },
});

// -------------------- Msg_box ---------------------------

Template.Message_subscriber.onCreated(function tmplMsgContainerOnCreated() {
  this.autorun(() => {
    // this is needed for comments
    const roomId = FlowRouter.getParam('_rid');
    this.subscribe('topics.byId', { _id: roomId });
  });
});

Template.Message_subscriber.onRendered(function tmplMsgBoxOnRendered() {
  this.autorun(() => {
    $('.chat-discussion').scrollTop($('.chat-discussion')[0].scrollHeight);
    const roomId = FlowRouter.getParam('_rid');
    if (this.subscriptionsReady()) {
      Meteor.user().hasNowSeen(roomId);
    }
  });

 /* $('.full-height-scroll').slimscroll({
    height: '100%',
    start: 'bottom',
  });*/
});

Template.Message_history.viewmodel({
  messages: [],
  lastStatusChange: undefined,
  autorun() {
    const roomId = FlowRouter.getParam('_rid');
    const comments = Comments.find({ topicId: roomId }, { sort: { createdAt: 1 } });
    let lastStatusChange;
    comments.forEach(comment => {
      if (comment.category === 'statusChange') lastStatusChange = comment;
    });
    this.messages(comments.fetch());
    this.lastStatusChange(lastStatusChange);
  },
  statusesWithDataUpdate() {
    return ['requested', 'offered', 'preapproved', 'proposed', 'agreed'];
  },
  ownMessage(comment) {
    return comment.creatorId === Meteor.userId();
  },
  leftOrRight(comment) {
    return this.ownMessage(comment) ? 'right' : 'left';
  },
});

// -------------------- Msg_send ---------------------------

Template.Message_send.events({
  'click .js-send'(event, instance) {
    const textarea = instance.find('textarea');
    const text = textarea.value;
    const roomId = FlowRouter.getParam('_rid');
    Meteor.call('comments.insert', {
      topicId: roomId,
      text,
    },
    onSuccess((res) => {
      textarea.value = '';
      if ($(window).width() > 768) $('.js-focused').focus();
    }));
  },
  'click .js-delete'(event, instance) {
    const roomId = FlowRouter.getParam('_rid');
    Modal.confirmAndCall(Topics.methods.remove, { _id: roomId }, {
      action: 'delete',
      entity: 'room',
      message: 'This will delete all messages in this room',
    });
  },
});
