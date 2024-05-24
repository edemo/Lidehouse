import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';

import './members-panel.html';

const MEMBERS_TO_SHOW = 10;

Template.Members_panel.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const userId = Meteor.userId();
    if (communityId && userId) {
      this.subscribe('topics.roomsOfUser', { communityId, userId });
    }
  });
});

Template.Members_panel.onRendered(function onRendered() {
});

Template.Members_panel.viewmodel({
  tooManyMembers: false,
  leaders() {
    const communityId = ModalStack.getVar('communityId');
    const partnerSearch = Session.get('messengerPartnerSearch');
    let managers = Memberships.findActive({ communityId, role: { $in: leaderRoles }, userId: { $exists: true, $ne: Meteor.userId() } }).fetch();
    managers = _.uniq(managers, false, m => m.userId);
    if (partnerSearch) {
      managers = managers.filter(m => m.partner() && m.partner().displayName().toLowerCase().search(partnerSearch.toLowerCase()) >= 0);
    }
    return managers;
  },
  members() {
    const communityId = ModalStack.getVar('communityId');
    const partnerSearch = Session.get('messengerPartnerSearch');
    let nonManagers = Memberships.findActive({ communityId, role: { $not: { $in: leaderRoles } }, userId: { $exists: true, $ne: Meteor.userId() } }).fetch();
    nonManagers = _.uniq(nonManagers, false, m => m.userId);
    if (nonManagers.length > MEMBERS_TO_SHOW * 2) this.tooManyMembers(true);
    if (partnerSearch) nonManagers = nonManagers.filter(m => m.partner() && m.partner().displayName().toLowerCase().search(partnerSearch.toLowerCase()) >= 0);
    else if (this.tooManyMembers()) nonManagers = nonManagers.filter(m => Rooms.getRoom(Session.get('roomMode'), m.userId));
    nonManagers = _.sortBy(nonManagers, m => {
      const room = Rooms.getRoom(Session.get('roomMode'), m.userId);
      return room ? -1 * room.updatedAt : 0;
    });
    return nonManagers;
  },
});

Template.Members_panel.events({
  'keyup #search'(event) {
    Session.set('messengerPartnerSearch', event.target.value);
  },
});

// ---------------------- Member_slot ----------------------

Template.Member_slot.onCreated(function onMsgPartnerCreated() {
});

Template.Member_slot.helpers({
  selectedClass() {
    const room = Rooms.getRoom(Session.get('roomMode'), this.userId);
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
  hasThingsToDisplay() {
    const room = Rooms.getRoom(Session.get('roomMode'), this.userId);
    if (!room) return undefined;
    return room.hasThingsToDisplayFor(Meteor.userId(), Meteor.users.SEEN_BY.EYES);
  },
});

Template.Member_slot.events({
  'click .member-slot'(event, instance) {
    Rooms.goToRoom(Session.get('roomMode'), instance.data.userId);
    $('#right-sidebar').toggleClass('sidebar-open');
    if ($(window).width() > 768) $('.js-focused').focus();
  },
});
