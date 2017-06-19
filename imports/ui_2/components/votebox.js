import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote } from '/imports/api/topics/votings/methods.js';
import { $ } from 'meteor/jquery';
import '../components/votebox.html';
import '../components/comments-section.js';

Template.Votebox.onCreated(function voteboxOnCreated() {
  this.state = new ReactiveDict();
});

Template.Votebox.onRendered(function voteboxOnRendered() {
  $('.sortable').sortable({ connectWith: '.sortable' });
  const voteResults = this.data.voteResults;
  const state = this.state;
//  this.autorun(function update() { // TODO: would be nicer in autorun
  const activeMembershipId = Session.get('activeMembershipId');
  const voteIsFinalized = activeMembershipId &&
    voteResults[activeMembershipId] &&
    voteResults[activeMembershipId].length > 0;
  state.set('voteFinalized', voteIsFinalized);
  $('.sortable').sortable(voteIsFinalized ? 'disable' : 'enable');
//  });
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
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  // Single choice voting
  pressedClass(choice) {
    const activeMembershipId = Session.get('activeMembershipId');
    if (!activeMembershipId || !this.voteResults) return '';
    const ownVote = this.voteResults[activeMembershipId] && this.voteResults[activeMembershipId][0];
    return (ownVote === choice) && 'btn-pressed';
  },
  // Preferential voting
  selectedChoices() {
    const activeMembershipId = Session.get('activeMembershipId');
    const results = this.voteResults[activeMembershipId];
    // We are returning an array here, where the elements are pairs of a choice,
    // and its corresponding ORIGINAL index in the vote.choices array
    if (results && results.length > 0) { // voter already casted vote
      const originalVoteChoices = this.vote.choices;
      const selectedChoices = results.map(function obj(index) { return { choice: originalVoteChoices[index], index }; });
      console.log('displaying:', selectedChoices);
      return selectedChoices;
    }
    // no vote yet, original vote choices are simply used
    return this.vote.choices.map(function obj(choice, index) { return { choice, index }; });
  },
  voteIsFinalized() {
    return Template.instance().state.get('voteFinalized');
  },
  pressedClassForPreferential() {
    if (Template.instance().state.get('voteFinalized')) return 'btn-pressed';
    return '';
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
      displayMessage('success', 'Vote casted');
    });
  },
  // event handler for the preferential vote type
  'click .btn-votesend'(event, instance) {
    const membershipId = Session.get('activeMembershipId');
    const topicId = this._id;
    const voteFinalized = instance.state.get('voteFinalized');
    if (!voteFinalized) {
      const choices = $('.sortable').sortable('toArray', { attribute: 'data-value' });
      console.log('casting:', choices);
      castVote.call({ topicId, membershipId, castedVote: choices }, function handle(err) {
        if (err) {
          displayError(err);
          return;
        }
        displayMessage('success', 'Vote casted');
        instance.state.set('voteFinalized', true);
        $('.sortable').sortable('disable');
      });
    } else { // voteFinalized === true
      instance.state.set('voteFinalized', false);
      $('.sortable').sortable('enable');
    }
  },
});
