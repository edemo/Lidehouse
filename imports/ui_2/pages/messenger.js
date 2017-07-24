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
    console.log("clicked", $('#people'));
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

const updateLastseen = function updateLastSeen() {
  // Set the lastseen for this topic, to the last comment on this topic
  const otherUserId = Session.get('messengerPersonId');
  const room = Topics.messengerRoom(Meteor.userId(), otherUserId);
  if (!room) return;
  const comments = room.comments().fetch(); // returns newest-first order
  if (!comments || comments.length === 0) return;
  const lastseenTimestamp = comments[0].createdAt;
  const modifier = {};
  modifier['$set'] = {};
  modifier['$set']['lastseens.' + room._id] = lastseenTimestamp;
  updateUser.call({ _id: Meteor.userId(), modifier }, handleError);
};

Template.Msg_box.onCreated(function tmplMsgBoxOnCreated() {
  /* doesn't need this, ever since MsgBox is only rendered when there is already communication between the users
  this.autorun(() => {
    const selectedPersonId = Session.get('messengerPersonId');
    if (selectedPersonId) {
      const roomId = Topics.messengerRoom(Meteor.userId(), selectedPersonId);
      if (roomId) {
        this.subscribe('comments.onTopic', { topicId: roomId });
      }
    }
  });
  */
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data.room._id });
  });
});

Template.Msg_box.onRendered(function tmplMsgBoxOnRendered() {
  this.autorun(() => {
    if (this.subscriptionsReady()) {
      updateLastseen();
    }
  });
});

Template.Msg_box.helpers({
  messages() {
    return Comments.find({ topicId: this.room._id }, { sort: { createdAt: 1 } });
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
      onSuccess(res => (textarea.value = '')),
      );
    };

    const room = instance.data.room;
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
