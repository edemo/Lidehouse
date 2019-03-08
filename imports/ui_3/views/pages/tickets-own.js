import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Topics } from '/imports/api/topics/topics.js';
import { moment } from 'meteor/momentjs:moment';
import './tickets-own.html';

Template.Tickets_own.viewmodel({
  ownTickets() {
    const userId = Meteor.userId();
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket', userId }, { sort: { createdAt: -1 } }).fetch();
  },
});
