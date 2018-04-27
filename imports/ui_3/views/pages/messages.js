import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { $ } from 'meteor/jquery';
import { handleError, onSuccess } from '/imports/ui/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { update as updateUser } from '/imports/api/users/methods.js';
import '/imports/api/topics/rooms/rooms.js';

import '../components/members-panel.js';
import './messages.html';

Template.Messages.onCreated(function onCreated() {
  this.state = new ReactiveDict();
  this.state.set('peopleOpen', false);
});

Template.Messages.helpers({
  peopleOpen() {
    const instance = Template.instance();
    return instance.state.get('peopleOpen') && 'people-open';
  },
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
  templateGestures: {
    'swiperight .cordova'(event, instance) {
      $('#people')[0].classList.remove('people-open');
    },
    'swipeleft .cordova'(event, instance) {
      $('#people')[0].classList.add('people-open');
    },
  },
});

Template.Messages.events({
  'click .js-people'(event) {
//  console.log("clicked", $('#people'));
    $('#people')[0].classList.toggle('people-open');
  },
  'click .content-overlay'(event, instance) {
    instance.state.set('peopleOpen', false);
    event.preventDefault();
  },
  'click #people .person'(event, instance) {
    $('#people')[0].classList.remove('people-open');
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
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    if (!room) return;
    if (this.subscriptionsReady()) {
      Meteor.user().hasNowSeen(room);
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
    let roomId;
    const insertMessage = () => {
      Meteor.call('comments.insert', {
        topicId: roomId,
        userId: Meteor.userId(),
        text,
      },
      onSuccess((res) => {
        textarea.value = '';
        Meteor.user().hasNowSeen(roomId);
      }));
    };

    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
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
        insertMessage();
      }),
      );
    }
  },
});
