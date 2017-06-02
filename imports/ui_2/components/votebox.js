import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { displayError } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote } from '/imports/api/topics/methods.js';

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
});

Template.Votebox.events({
  'click .btn-yes'(event, instance) {
    const membershipId = Session.get('activeMembershipId');
    const topicId = this._id;
    event.target.classList.toggle('pressed');
    castVote.call({ topicId, membershipId, castedVote: [1] }, function (err, res) {
      if (err) {
        displayError(err);
        return;
      }
    });
  },
  'click .btn-no'(event, instance) {
    // TODO
  },
  'click .btn-abstain'(event, instance) {
    // TODO
  },
})
