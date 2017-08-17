import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { onSuccess, displayMessage } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/proposal-view.js';
import '../components/votebox.html';
import '../components/comments-section.js';
import '../components/vote-results.js';

Template.Votebox.onCreated(function voteboxOnCreated() {
  this.state = new ReactiveDict();
});

Template.Votebox.onRendered(function voteboxOnRendered() {
  const self = this;
  const state = this.state;
  const voting = this.data;
  const vote = this.data.vote;
  const voteCasts = this.data.voteCasts;

  // creating the JQuery sortable widget
  // both JQuery and Blaze wants control over the order of elements, so needs a hacky solution
  // https://github.com/meteor/meteor/blob/master/examples/unfinished/reorderable-list/client/shark.js
  // https://differential.com/insights/sortable-lists-in-meteor-using-jquery-ui/
  $(self.find('.sortable')).sortable({
    stop(event, ui) { // fired when an item is dropped
      event.preventDefault();
      const preference = $(self.find('.sortable')).sortable('toArray', { attribute: 'data-value' })
        .map(function obj(value, index) { return { text: vote.choices[value], value }; });
        console.log('onstop:', preference);
      state.set('preference', preference);
    },
  });

  // this is in an autorun, so if logged in user changes, it will rerun
  // or if the vote is changed on another machine, it also gets updated here
  this.autorun(function update() {
    const voteIsFinalized = voting.hasVotedDirect(Meteor.userId())
    state.set('voteIsFinalized', voteIsFinalized);

    let preference;
    if (voteIsFinalized) {
      const castedPreference = voteCasts[Meteor.userId()];
      preference = castedPreference.map(function obj(value) { return { text: vote.choices[value], value }; });
    } else { // no vote yet, preference is then the original vote choices in that order
      preference = vote.choices.map(function obj(text, index) { return { text, value: index }; });
    }
    state.set('preference', preference);
    console.log('onrender:', preference);
  });

  // This is where we enable/disable the sorting, dependant on the finalized state
  this.autorun(function update() {
    const voteIsFinalized = state.get('voteIsFinalized');
    $(self.find('.sortable')).sortable(voteIsFinalized ? 'disable' : 'enable');
  });
});

Template.Votebox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
  displayCreatedAtTime() {
    return moment(this.createdAt).format('YYYY.MM.DD hh:mm');
  },
  displayClosesAtTime() {
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
    const userId = Meteor.userId();
    if (!this.voteCasts) return '';
    const ownVote = this.voteCasts[userId] && this.voteCasts[userId][0];
    return (ownVote === choice) && 'btn-pressed';
  },
  // Preferential voting
  currentPreference() {
    const preference = Template.instance().state.get('preference');
    console.log('ondisplay:', preference);
    return preference;
  },
  voteIsFinalized() {
    return Template.instance().state.get('voteIsFinalized');
  },
  pressedClassForPreferential() {
    if (Template.instance().state.get('voteIsFinalized')) return 'btn-pressed';
    return '';
  },
});

Template.Votebox.events({
  'click .btn-golive'(event) {
    const modalContext = {
      title: 'Live voting',
      body: 'Votebox',
      bodyContext: _.extend(this, { live: true }),
      btnClose: 'cancel',
      btnPrimary: 'send vote',
    };
    Modal.show('Modal', modalContext);
  },
  // event handler for the single choice vote type
  'click .btn-vote'(event) {
    const topicId = this._id;
    const choice = $(event.target).data('value');
    castVote.call({ topicId, castedVote: [choice] },
      onSuccess(res => displayMessage('success', 'Vote casted'))
    );
  },
  // event handler for the preferential vote type
  'click .btn-votesend'(event, instance) {
    const topicId = this._id;
    const voteIsFinalized = instance.state.get('voteIsFinalized');
    if (!voteIsFinalized) {
      const preference = instance.state.get('preference');
      console.log('casting:', preference);
      const castedVote = preference.map(p => p.value);
      castVote.call({ topicId, castedVote },
        onSuccess((res) => {
          displayMessage('success', 'Vote casted');
          instance.state.set('voteIsFinalized', true);
          console.log('casted:', preference);
        })
      );
    } else { // voteIsFinalized === true
      instance.state.set('voteIsFinalized', false);
    }
  },
  'click .js-view-proposal'(event, instance) {
    const modalContext = {
      title: 'Official proposal',
      body: 'Proposal_view',
      bodyContext: this,
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
  'click .js-close'(event, instance) {
    closeVote.call({ topicId: this._id },
      onSuccess((res) => {
        displayMessage('success', 'Vote closed');
      })
    );
  },
  'click .js-view-results'(event, instance) {
    const modalContext = {
      title: 'Vote results',
      body: 'Vote_results',
      bodyContext: this,
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
});
