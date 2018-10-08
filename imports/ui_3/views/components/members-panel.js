import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// import { ReactiveDict } from 'meteor/reactive-dict';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/rooms/rooms.js';

import './members-panel.html';

Template.Members_panel.onCreated(function onCreated() {
  const communityId = Session.get('activeCommunityId');
  const manager = Memberships.findOne({ communityId, 'active.now': true, role: 'manager' });
  if (manager) Session.set('messengerPersonId', manager.person.userId);
});

Template.Members_panel.onRendered(function onRendered() {
});

Template.Members_panel.helpers({
  leaders() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    let managers = Memberships.find({ communityId, 'active.now': true, role: { $in: leaderRoles }, 'person.userId': { $ne: Meteor.userId() } }).fetch();
    if (personSearch) {
      managers = managers.filter(m => m.Person().displayName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    return managers;
  },
  members() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    let nonManagers = Memberships.find({ communityId, 'active.now': true, role: { $not: { $in: leaderRoles } }, 'person.userId': { $exists: true, $ne: Meteor.userId() } }).fetch();
    if (personSearch) {
      nonManagers = nonManagers.filter(m => m.Person().displayName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    nonManagers = _.uniq(nonManagers, false, m => m.person.userId);
    nonManagers = _.sortBy(nonManagers, m => {
      const room = Topics.messengerRoom(Meteor.userId(), m.person.userId);
      return room ? -1 * room.updatedAt : 0;
    });
    return nonManagers;
  },
});

Template.Members_panel.events({
  'keyup #search'(event) {
    Session.set('messengerPersonSearch', event.target.value);
  },
});

// ---------------------- Member_slot ----------------------

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
    return room.unseenCommentsBy(Meteor.userId(), Meteor.users.SEEN_BY_EYES) > 0;
  },
  unreadMessagesCount() {
    const room = Topics.messengerRoom(this.person.userId, Meteor.userId());
    return room.unseenCommentsBy(Meteor.userId(), Meteor.users.SEEN_BY_EYES);
  },
});

Template.Member_slot.events({
  'click .member-slot'(event, instance) {
    Session.set('messengerPersonId', instance.data.person.userId);
    $('#right-sidebar').toggleClass('sidebar-open');
    if ($(window).width() > 768) $('.js-focused').focus();
  },
});
