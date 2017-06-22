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

  const self = this;
  const state = this.state;
  const vote = this.data.vote;
  const voteResults = this.data.voteResults;

  // creating the JQuery sortable widget
  $(self.find('.sortable')).sortable({
    stop(event, ui) { // fired when an item is dropped
      event.preventDefault();
      const preference = $(self.find('.sortable')).sortable('toArray', { attribute: 'data-value' })
        .map(function obj(value, index) { return { text: vote.choices[value], value }; });
        console.log('onstop:', preference);
      state.set('preference', preference);
    },
  });

  // this is in an autorun, so if activeMembershipId changes, it will rerun
  this.autorun(function update() {
    const activeMembershipId = Session.get('activeMembershipId');
    const voteIsFinalized = activeMembershipId &&
      voteResults[activeMembershipId] &&
      voteResults[activeMembershipId].length > 0;
    state.set('voteFinalized', voteIsFinalized);

    const castedPreference = voteResults[activeMembershipId];
    let preference;
    if (voteIsFinalized) {
      preference = castedPreference.map(function obj(value) { return { text: vote.choices[value], value }; });
    } else { // no vote yet, preference is then the original vote choices in that order
      preference = vote.choices.map(function obj(text, index) { return { text, value: index }; });
    }
    state.set('preference', preference);
    console.log('onrender:', preference);
  });

  this.autorun(function update() {
    const voteIsFinalized = state.get('voteIsFinalized');
    $('.sortable').sortable(voteIsFinalized ? 'disable' : 'enable');
  });
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
  currentPreference() {
    const preference = Template.instance().state.get('preference');
    console.log('ondisplay:', preference);
    return preference;
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
      const preference = instance.state.get('preference');
      console.log('casting:', preference);
      const castedVote = preference.map(p => p.value);
      castVote.call({ topicId, membershipId, castedVote }, function handle(err) {
        if (err) {
          displayError(err);
          return;
        }
        displayMessage('success', 'Vote casted');
        instance.state.set('voteFinalized', true);
        console.log('casted:', preference);
      });
    } else { // voteFinalized === true
      instance.state.set('voteFinalized', false);
    }
  },
});
