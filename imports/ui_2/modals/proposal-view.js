import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import './modal.js';
import './proposal-view.html';

Template.Proposal_view.helpers({
  displayCreatedAtTime() {
    return moment(this.createdAt).format('L LT');
  },
  displayClosesAtTime() {
    return moment(this.vote.closesAt).format('L LT');
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
});
