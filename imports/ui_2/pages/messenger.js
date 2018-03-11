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

import './messenger.html';

Template.Messenger.onCreated(function onCreated() {
  this.state = new ReactiveDict();
  this.state.set('peopleOpen', false);
});

Template.Messenger.helpers({
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

Template.Messenger.events({
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

Template.Msg_box.onCreated(function tmplMsgBoxOnCreated() {
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

Template.Msg_box.onRendered(function tmplMsgBoxOnRendered() {
  this.autorun(() => {
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    if (!room) return;
    if (this.subscriptionsReady()) {
      Meteor.user().hasNowSeen(room);
    }
  });
});

Template.Msg_box.helpers({
  messages() {
    const room = Topics.messengerRoom(Meteor.userId(), Session.get('messengerPersonId'));
    return Comments.find({ topicId: room._id }, { sort: { createdAt: 1 } });
  },
  ownMessage(comment) {
    return comment.userId === Meteor.userId();
  },
});

// -------------------- Msg_send ---------------------------

Template.Msg_send.events({
  'click .btn-comment'(event, instance) {
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
