import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';

import './members-panel.html';

const MEMBERS_TO_SHOW = 10;

Template.Members_panel.onCreated(function onCreated() {
//  const communityId = Session.get('activeCommunityId');
//  const manager = Memberships.findOne({ communityId, active: true, role: 'manager' });
//  if (manager) Session.set('messengerPersonId', manager.person.userId);
});

Template.Members_panel.onRendered(function onRendered() {
});

Template.Members_panel.viewmodel({
  tooManyMembers: false,
  leaders() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    let managers = Memberships.find({ communityId, active: true, role: { $in: leaderRoles }, 'person.userId': { $exists: true, $ne: Meteor.userId() } }).fetch();
    managers = _.uniq(managers, false, m => m.person.userId);
    if (personSearch) {
      managers = managers.filter(m => m.Person().displayName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    return managers;
  },
  members() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('messengerPersonSearch');
    let nonManagers = Memberships.find({ communityId, active: true, role: { $not: { $in: leaderRoles } }, 'person.userId': { $exists: true, $ne: Meteor.userId() } }).fetch();
    nonManagers = _.uniq(nonManagers, false, m => m.person.userId);
    if (nonManagers.length > MEMBERS_TO_SHOW * 2) this.tooManyMembers(true);
    if (personSearch) {
      nonManagers = nonManagers.filter(m => m.Person().displayName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    } else {
      if (this.tooManyMembers()) {
        nonManagers = nonManagers.filter(m => Rooms.getRoom(Session.get('roomMode'), m.person.userId));
      } else {
        nonManagers = _.sortBy(nonManagers, m => {
          const room = Rooms.getRoom(Session.get('roomMode'), m.person.userId);
          return room ? -1 * room.updatedAt : 0;
        });
      }
    }
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
    const room = Rooms.getRoom(Session.get('roomMode'), this.person.userId);
    if (room && room._id === FlowRouter.getParam('_rid')) return 'selected';
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
    const room = Rooms.getRoom(Session.get('roomMode'), this.person.userId);
    if (!room) return false;
    return room.unseenCommentCountBy(Meteor.userId(), Meteor.users.SEEN_BY.EYES) > 0;
  },
  unreadMessagesCount() {
    const room = Rooms.getRoom(Session.get('roomMode'), this.person.userId);
    return room.unseenCommentCountBy(Meteor.userId(), Meteor.users.SEEN_BY.EYES);
  },
});

Template.Member_slot.events({
  'click .member-slot'(event, instance) {
    Rooms.goToRoom(Session.get('roomMode'), instance.data.person.userId);
    $('#right-sidebar').toggleClass('sidebar-open');
    if ($(window).width() > 768) $('.js-focused').focus();
  },
});
