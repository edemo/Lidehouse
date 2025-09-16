import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';
import { Deals } from '/imports/api/marketplace/deals/deals.js';

import './members-panel.html';

const tabs = {
  'private chat': {
    index: 1,
    name: 'private chat',
    icon: 'fa-comments-o',
    title: 'Send messages title',
    subtitle: 'Send messages subtitle',
    active: () => true,
  },
  'group chat': {
    index: 2,
    name: 'group chat',
    icon: 'fa-group',
    title: 'Group messages title',
    subtitle: 'Group messages subtitle',
    active: () => true,
  },
  'deal chat': {
    index: 3,
    name: 'deal chat',
    icon: 'fa-handshake-o',
    title: 'Deal messages title',
    subtitle: 'Deal messages subtitle',
    active: () => getActiveCommunity()?.isActiveModule('marketplace'),
  },
  'tech support': {
    index: 4,
    name: 'tech support',
    icon: 'fa-question-circle',
    title: 'Tech support title',
    subtitle: 'Tech support subtitle',
    active: () => Meteor.user()?.hasPermission('do.techsupport'),
  },
}
const MEMBERS_TO_SHOW = 10;

Template.Members_panel.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const userId = Meteor.userId();
    if (communityId && userId) {
      this.subscribe('topics.roomsOfUser', { communityId, userId });
      this.subscribe('buckets.inCommunity', { communityId });
      this.subscribe('listings.inCommunity', { communityId });
      this.subscribe('deals.inCommunity', { communityId });
      this.subscribe('reviews.inCommunity', { communityId });
    }
  });
});

Template.Members_panel.onRendered(function onRendered() {
  Session.set('roomMode', 'private chat');
});

Template.Members_panel.viewmodel({
  tooManyMembers: false,
  tabsActive() {
    const activeTabs = [];
    _.each(tabs, tab => {
      if (tab.active()) activeTabs.push(tab);
    });
    return activeTabs;
  },
  activeClass(tabName) {
    return (Session.get('roomMode') === tabName) && 'active';
  },
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
    let nonManagers = Memberships.find({ communityId, role: { $not: { $in: leaderRoles } }, userId: { $exists: true, $ne: Meteor.userId() } }).fetch();
    nonManagers = _.uniq(nonManagers, false, m => m.userId);
    if (nonManagers.length > MEMBERS_TO_SHOW * 2) this.tooManyMembers(true);
    if (partnerSearch) nonManagers = nonManagers.filter(m => m.partner() && m.partner().displayName().toLowerCase().search(partnerSearch.toLowerCase()) >= 0);
    else if (this.tooManyMembers()) nonManagers = nonManagers.filter(m => Rooms.getRoom(Session.get('roomMode'), m.userId));
    nonManagers = _.sortBy(nonManagers, m => {
      const room = Rooms.getRoom(this.roomMode, m.userId);
      return room ? -1 * room.updatedAt : 0;
    });
    return nonManagers;
  },
  existingRooms(roomMode) {
    const communityId = ModalStack.getVar('communityId');
    const rooms = Topics.find({ communityId, category: 'room', title: roomMode });
    return rooms;
  },
  existingRoomMembers(roomMode) {
    const communityId = ModalStack.getVar('communityId');
    const currentUserId = Meteor.userId();
    const rooms = this.existingRooms(roomMode);
    return rooms.map(room => {
      const otherUserId = room.participantIds.find(id => id !== currentUserId);
      const membership = Memberships.findOne({ communityId, userId: otherUserId });
      return membership;
    });
  },
  existingDeals() {
    const communityId = ModalStack.getVar('communityId');
    const deals = Deals.find({ communityId, participantIds: Meteor.userId() });
    return deals;
  },
  unseenEventsCount(roomMode) {
    const communityId = ModalStack.getVar('communityId');
    const userId = Meteor.userId();
    const rooms = Topics.find({ communityId, category: 'room', title: roomMode });
    let count = 0;
    const correspondents = [];
    rooms.map(room => {
      const unseenCommentsCount = room.hasThingsToDisplayFor(userId, Meteor.users.SEEN_BY.EYES);
      count += unseenCommentsCount;
      if (unseenCommentsCount > 0) {
        const otherUserId = room.participantIds.find(id => id !== userId);
        const otherUserName = Meteor.users.findOne(otherUserId)?.displayOfficialName();
        correspondents.push(`${otherUserName} [${otherUserId}]`);
      }
    });
    return { count, correspondents };
  },
});

Template.Members_panel.events({
  'click .js-tab-select'(event, instance) {
    const tabName = $(event.target).closest('[data-value]').data('value');
    Session.set('roomMode', tabName);
  },
  'keyup #search'(event) {
    Session.set('messengerPartnerSearch', event.target.value);
  },
});

// ---------------------- Member_slot ----------------------

Template.Member_slot.onCreated(function onMsgPartnerCreated() {
});

Template.Member_slot.viewmodel({
  partner() {
    if (this.templateInstance.data.membership) return this.templateInstance.data.membership.partner();
    if (this.templateInstance.data.deal) return this.templateInstance.data.deal.otherPartner(Meteor.user());
    debugAssert(false);
  },
  existingRoom(){
    if (this.templateInstance.data.membership) return Rooms.getRoom(this.templateInstance.data.roomMode, this.templateInstance.data.membership.userId);
    else if (this.templateInstance.data.deal) return Topics.findOne(this.templateInstance.data.deal.roomId);
    else { debugAssert(false); return undefined; }
  },
  selectedClass() {
    const roomId = this.existingRoomId();
    if (roomId && roomId === FlowRouter.getParam('_rid')) return 'selected';
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
    const room = this.existingRoom();
    if (!room) return undefined;
    return room.hasThingsToDisplayFor(Meteor.userId(), Meteor.users.SEEN_BY.EYES);
  },
});

Template.Member_slot.events({
  'click .member-slot'(event, instance) {
    const room = instance.viewmodel.existingRoom();
    if (room) Rooms.goToExistingRoom(room._id);
    else if (instance.data.roomMode === 'private chat') Rooms.goToPrivateChatRoom(instance.data.roomMode, instance.data.membership.userId);  // creates the chat room
    $('#right-sidebar').toggleClass('sidebar-open');
    if ($(window).width() > 768) $('.js-focused').focus();
  },
});
