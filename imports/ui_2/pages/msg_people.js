import { Template } from 'meteor/templating';
// import { ReactiveDict } from 'meteor/reactive-dict';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { Memberships } from '/imports/api/memberships/memberships.js';

import './msg_people.html';
import './messenger.html';


Template.Msg_people.onCreated(function onCreated() {
});

Template.Msg_people.helpers({
  managers() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId, role: 'manager' });
  },
  members() {
    const communityId = Session.get('activeCommunityId');
    const personSearch = Session.get('personSearch');
    const nonManagers = Memberships.find({ communityId, role: { $not: 'manager' } });
    if (personSearch) {
      return nonManagers.fetch().filter(m => m.user().fullName().toLowerCase().search(personSearch.toLowerCase()) >= 0);
    }
    return nonManagers;
  },
});

Template.Msg_people.events({
  'keyup #search'(event) {
    Session.set('personSearch', event.target.value);
  },
});

// ---------------------- Msg_person ----------------------

Template.Msg_person.helpers({
  statusCircleParameters(status) {
    const params = {
      cx: '5',
      cy: '5',
      r: '5',
    };
    switch (status) {
      case 'online': _.extend(params, { fill: 'green' }); break;
      case 'standby': _.extend(params, { fill: 'yellow' }); break;
      case 'offline': _.extend(params, { fill: 'white', r: '4', stroke: 'black', 'stroke-width': '1' }); break;
      default: _.extend(params, { fill: 'pink' });
    }
    return params;
  },
});
