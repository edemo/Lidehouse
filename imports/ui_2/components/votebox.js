import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { displayError } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote } from '/imports/api/topics/methods.js';
import { $ } from 'meteor/jquery';
import '../components/votebox.html';
import '../components/comments-section.js';

Template.Votebox.onRendered(function voteboxOnRendered() {
});

Template.Votebox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
  displayTime() {
    return moment(this.vote.closesAt).format('YYYY.MM.DD hh:mm');
  },
  displayTimeLeft() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.vote.closesAt).from(serverTimeNow);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { $sort: { createdAt: 1 } });
  },
  pressedClass(choice) {
    const activeMembershipId = Session.get('activeMembershipId');
    if (!activeMembershipId || !this.voteResults) return '';
    const ownVote = this.voteResults[activeMembershipId][0];
    return (ownVote === choice) && 'btn-pressed';
  },
});

Template.Votebox.events({
  // event handler for the single choice vote type
  'click .btn-vote'(event) {
    const membershipId = Session.get('activeMembershipId');
    const topicId = this._id;
    const choice = $(event.target).data('index');
    castVote.call({ topicId, membershipId, castedVote: [choice] }, function handle(err) {
      if (err) {
        displayError(err);
        return;
      }
    });
  },
  // event handler for the preferential vote type
  'click .js-send-vote'(event) {
    const membershipId = Session.get('activeMembershipId');
    const topicId = this._id;
    const choices = []; // TODO: Get the ordering and put it into the choices array
    castVote.call({ topicId, membershipId, castedVote: choices }, function handle(err) {
      if (err) {
        displayError(err);
        return;
      }
    });
  },
});
