import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// import { ReactiveDict } from 'meteor/reactive-dict';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/rooms/rooms.js';

import './msg_people.html';
import './messenger.html';


Template.Msg_people.onCreated(function onCreated() {
});

Template.Msg_people.onCreated(function onRendered() {
  const communityId = Session.get('activeCommunityId');
  const manager = Memberships.findOne({ communityId, role: 'manager' });
  if (manager) Session.set('messengerPersonId', manager.userId);
});

Template.Msg_people.helpers({
  managers() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId, userId: { $not: Meteor.userId() }, role: 'manager' });
  },
  members() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    const nonManagers = Memberships.find({ communityId, userId: { $not: Meteor.userId() }, role: { $not: 'manager' } });
    if (personSearch) {
      return nonManagers.fetch().filter(m => m.user().fullName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    return nonManagers;
  },
});

Template.Msg_people.events({
  'keyup #search'(event) {
    Session.set('messengerPersonSearch', event.target.value);
  },
});

// ---------------------- Msg_person ----------------------

Template.Msg_person.onCreated(function onMsgPersonCreated() {
  this.autorun(() => {    // TODO: It would enough to subscribe here to the Count
    const room = Topics.messengerRoom(this.data.userId, Meteor.userId());
    if (room) this.subscribe('comments.onTopic', { topicId: room._id });
  });
});

Template.Msg_person.helpers({
  selectedClass() {
    if (Session.get('messengerPersonId') === this.userId) return 'selected';
    return '';
  },
  /* statusCircleColor(status) {
    switch (status) {
      case 'online': return 'green';
      case 'standby': return '#FFD801';
      case 'offline': return 'white';
      default: return 'pink';
    }
  },*/
  statusCircleParameters(status) {
    const rubberDuckyYellow = '#FFD801';
    const params = {
      cx: '5',
      cy: '5',
      r: '5',
    };
    switch (status) {
      case 'online': _.extend(params, { fill: 'green' }); break;
      case 'standby': _.extend(params, { fill: rubberDuckyYellow }); break;
      case 'offline': _.extend(params, { fill: 'white', r: '4', stroke: 'black', 'stroke-width': '1' }); break;
      default: _.extend(params, { fill: 'pink' });
    }
    return params;
  },
  hasUnreadMessages() {
    const room = Topics.messengerRoom(this.userId, Meteor.userId());
    if (!room) return false;
    if (!room.comments()) return false;
    return room.comments().count() > 0;
  },
  unreadMessagesCount() {
    const room = Topics.messengerRoom(this.userId, Meteor.userId());
    return room.comments().count();
  },
});

Template.Msg_person.events({
  'click .person'(event, instance) {
    Session.set('messengerPersonId', instance.data.userId);
  },
});
