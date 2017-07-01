import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { $ } from 'meteor/jquery';
import { displayError } from '/imports/ui/lib/errors.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
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

/*
Template.Msg_box.onCreated(function onCreated() {
  this.autorun(() => {
    const selectedPersonId = Session.get('messengerPersonId');
    if (selectedPersonId) {
      const roomId = Topics.messengerRoom(Meteor.userId(), selectedPersonId);
      if (roomId) {
        this.subscribe('comments.onTopic', { topicId: roomId });
      }
    }
  });
});
*/

Template.Msg_box.onCreated(function onCreated() {
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data.room._id });
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
    const insertMessage = function () {
      Meteor.call('comments.insert', {
        topicId: roomId,
        userId: Meteor.userId(),
        text,
      });
      textarea.value = '';
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
      }, function handle(err, res) {
        if (err) {
          displayError(err);
          return;
        }
        roomId = res;
        insertMessage();
      });
    }
  },
});
