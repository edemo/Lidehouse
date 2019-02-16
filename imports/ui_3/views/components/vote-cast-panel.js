/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote } from '/imports/api/topics/votings/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../components/select-voters.js';
import './vote-cast-panel.html';
import { createEnvelope } from './envelope.js';

Template.Vote_cast_panel.onCreated(function voteCastPanelOnCreated() {
  this.state = new ReactiveDict();
  this.state.set('temporaryVote', undefined);
});

Template.Vote_cast_panel.onRendered(function voteboxOnRendered() {
  const self = this;
  const state = this.state;
  const topicId = this.data._id;
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
//      console.log('onstop:', preference);
      state.set('temporaryVote', preference);
    },
  });

  // this is in an autorun, so if logged in user changes, it will rerun
  // or if the vote is changed on another machine, it also gets updated here

  this.autorun(function update() {

    const voting = Topics.findOne(topicId);
    const hasVotedState = voting.hasVoted(Meteor.userId());
    state.set('hasVotedState', hasVotedState);
    let preference;

    if (hasVotedState) {
      const castedPreference = voting.voteOf(Meteor.userId());
      preference = castedPreference.map(function obj(value) { return { text: vote.choices[value], value }; });
    } else { // no vote yet, preference is then the original vote choices in that order
      preference = vote.choices.map(function obj(text, index) { return { text, value: index }; });
    }

    state.set('preference', preference);
//  console.log('onrender:', preference);
  });

  // This is where we enable/disable the sorting, dependant on the finalized state
  this.autorun(function update() {
    const hasVotedState = state.get('hasVotedState');
    const temporaryVote = state.get('temporaryVote');
    $(self.find('.sortable')).sortable((hasVotedState && temporaryVote === undefined) ? 'disable' : 'enable');
   /* const voting = Topics.findOne(topicId);
    const hasVoted = voting.hasVoted(Meteor.userId());
    $(Template.instance().find('.sortable')).sortable(hasVoted ? 'disable' : 'enable');
  */
  });

  const voteEnvelope = createEnvelope(this.$('.letter-content'));
  let firstRun = true;
  let directionWatcher;

  if (state.get('hasVotedState') && firstRun) {
    voteEnvelope.closed();
    directionWatcher = true;
  }
  if (!state.get('hasVotedState') && firstRun) {
    voteEnvelope.opened();
    directionWatcher = false;
  }

  this.autorun(() => {
    const hasVotedState = state.get('hasVotedState');
    const temporaryVote = state.get('temporaryVote');
    if (hasVotedState && !firstRun && temporaryVote === undefined && directionWatcher === false) {
      voteEnvelope.close();
      directionWatcher = true;
    }
    if (hasVotedState && !firstRun && _.isDefined(temporaryVote) && directionWatcher === true) {
      voteEnvelope.open();
      directionWatcher = false;
    }
    firstRun = false;
  });

});

Template.Vote_cast_panel.helpers({
  /*indirectUser() {
    const myVotePath = this.votePaths[Meteor.userId()];
    const myFirstDelegateId = myVotePath[1];
    const myFirstDelegate = Meteor.users.findOne(myFirstDelegateId);
    return myFirstDelegate;
  },*/
  originalState() {
    return this.originalState();
  },
  votingState() {
    return this.votingState();
  },
  castedVoteState() {
    return this.castedVoteState();
  },
  modifyState() {
    return this.modifyState();
  },
  voterAvatar() {
    const userId = Meteor.userId();
    const user = Meteor.users.findOne(userId);
    if (this.hasVotedDirect(userId)) {
      return user.avatar;
    }
    if (this.hasVotedIndirect(userId)) {
      const myVotePath = this.votePaths[Meteor.userId()];
      const myFirstDelegateId = myVotePath[1];
      const myFirstDelegate = Meteor.users.findOne(myFirstDelegateId);
      return myFirstDelegate.avatar;
    }
    return undefined;
  },
  isButtonLayoutVertical() {
    return this.vote.type === 'preferential';
  },
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    const userId = Meteor.userId();
    const votedChoice = this.voteOf(userId);
    const temporaryVote = Template.instance().state.get('temporaryVote');
    if (this.votingState() || this.modifyState()) return choice === temporaryVote && 'btn-pressed';
    if (this.castedVoteState()) return _.isEqual(votedChoice, [choice]) && 'btn-pressed';
    return undefined;
  },
  // Preferential voting
  currentPreference() {
    let preference;
    if (this.votingState() || this.modifyState()) {
      preference = Template.instance().state.get('temporaryVote');
      return preference;
    }
    if (this.castedVoteState() || this.originalState()) {
      preference = Template.instance().state.get('preference');
      return preference;
    }
    return undefined;
//  console.log('ondisplay:', preference);
  },
  voteOfUser() {
    return this.voteOf(Meteor.userId());
  },
  stateClassForSendButton() {
    if (this.votingState() || this.modifyState()) return 'visible-button';
    if (this.originalState() || this.castedVoteState()) return 'invisible-button';
    return undefined;
  },
  textForVote() {
    if (this.castedVoteState()) return 'Modify vote';
    return 'Cancel';
  },
});

function castVoteBasedOnPermission(topicId, castedVote, callback) {
  const communityId = Session.get('activeCommunityId');
  if (Meteor.user().hasPermission('vote.castForOthers', communityId)) {
    const modalContext = {
      title: 'Proxy voting',
      body: 'Select_voters',
      bodyContext: _.extend(this, { topicId, castedVote }),
      btnClose: 'cancel',
      btnOK: 'Send vote',
      onOK() {
        castVote.call(
          { topicId, castedVote, voters: AutoForm.getFieldValue('voters', 'af.select.voters') },
          callback
        );
      },
    };
    Modal.show('Modal', modalContext);
  } else {
    castVote.call({ topicId, castedVote }, callback);
  }
}

Template.Vote_cast_panel.events({
  // event handler for the single choice vote type
  'click .btn-vote'(event) {
    if (this.votingState() || this.modifyState() || this.originalState()) {
      Template.instance().state.set('temporaryVote', $(event.target).closest('.btn').data('value'));
    } else {
      return;
    }
  },
  'click .send-button'(event, instance) {
    const topicId = this._id;
    if (this.vote.type === 'preferential') {
      if (this.votingState() || this.modifyState()) {
        const preference = instance.state.get('temporaryVote');
        const castedVote = preference.map(p => p.value);
        castVoteBasedOnPermission(topicId, castedVote,
          onSuccess((res) => {
            displayMessage('success', 'Vote casted');
          })
        );
        Template.instance().state.set('temporaryVote', undefined);
      }
    } else {
      const temporaryVote = Template.instance().state.get('temporaryVote');
      castVoteBasedOnPermission(topicId, [temporaryVote],
        onSuccess(res => displayMessage('success', 'Vote casted'))
      );
      Template.instance().state.set('temporaryVote', undefined);
    }
  },
  'click .js-modify'() {
    const userId = Meteor.userId();
    if (this.modifyState() || this.votingState()) {
      Template.instance().state.set('temporaryVote', undefined);
      return;
    }
    if (!this.modifyState()) {
      if (this.vote.type === 'preferential') {
        const preference = Template.instance().state.get('preference');
        Template.instance().state.set('temporaryVote', preference);
      } else {
        Template.instance().state.set('temporaryVote', this.voteOf(userId)[0]);
      }
    }
  },
});

/*
Template.User_vote_status.events({
  'click .js-revoke'(event) {
    const topicId = this._id;
    const vote = [];  // indicates a no-vote
    castVote.call({ topicId, castedVote: vote },
      onSuccess(res => displayMessage('success', 'Vote revoked'))
    );
    Template.instance().state.set('choice', undefined);
  },
});
*/
