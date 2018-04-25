import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// import { ReactiveDict } from 'meteor/reactive-dict';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/rooms/rooms.js';

import './members-panel.html';

Template.Members_panel.onCreated(function onCreated() {
  const communityId = Session.get('activeCommunityId');
  const manager = Memberships.findOne({ communityId, role: 'manager' });
  if (manager) Session.set('messengerPersonId', manager.person.userId);
});

Template.Members_panel.onRendered(function onRendered() {
});

Template.Members_panel.helpers({
  managers() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId, 'person.userId': { $not: Meteor.userId() }, role: 'manager' });
  },
  members() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    const nonManagers = Memberships.find({ communityId, 'person.userId': { $exists: true, $not: Meteor.userId() }, role: { $not: 'manager' } });
    if (personSearch) {
      return nonManagers.fetch().filter(m => m.Person().displayName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    return nonManagers;
  },
});

Template.Members_panel.events({
  'keyup #search'(event) {
    Session.set('messengerPersonSearch', event.target.value);
  },
});

// ---------------------- Msg_person ----------------------

Template.Member_slot.onCreated(function onMsgPersonCreated() {
});

Template.Member_slot.helpers({
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
    const room = Topics.messengerRoom(this.person.userId, Meteor.userId());
    if (!room) return false;
    return room.unseenCommentsBy(Meteor.userId()) > 0;
  },
  unreadMessagesCount() {
    const room = Topics.messengerRoom(this.person.userId, Meteor.userId());
    return room.unseenCommentsBy(Meteor.userId());
  },
});

Template.Member_slot.events({
  'click .member-slot'(event, instance) {
    Session.set('messengerPersonId', instance.data.person.userId);
  },
});
