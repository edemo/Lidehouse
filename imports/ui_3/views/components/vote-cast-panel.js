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

Template.Vote_cast_panel.viewmodel({
  topic: undefined,
  temporaryVote: undefined,
  preference: undefined,
  hasVotedState: false,
  onCreated(instance) {
    instance.firstRun = true;
    this.topic(instance.data);
  },
  onRendered(instance) {
    const self = this;
    const vote = instance.data.vote;

    // creating the JQuery sortable widget
    // both JQuery and Blaze wants control over the order of elements, so needs a hacky solution
    // https://github.com/meteor/meteor/blob/master/examples/unfinished/reorderable-list/client/shark.js
    // https://differential.com/insights/sortable-lists-in-meteor-using-jquery-ui/
    if (vote.type === 'preferential') {
      instance.$('.sortable').sortable({
        stop(event, ui) { // fired when an item is dropped
          event.preventDefault();
          const preference = instance.$('.sortable').sortable('toArray', { attribute: 'data-value' })
            .map(function obj(value, index) { return { text: vote.choices[value], value }; });
    //      console.log('onstop:', preference);
          self.temporaryVote(preference);
        },
      });
    }

    instance.voteEnvelope = createEnvelope(instance.$('.letter-content'));
  },
  autorun: [
    function maintainLiveData() {
      this.topic(Topics.findOne(this.templateInstance.data._id)); 
    },
    function syncHasVotedState() {
      const hasVotedState = this.topic().hasVoted(Meteor.userId());
      this.hasVotedState(hasVotedState);
    },
    function syncPreference() {
      let preference;
      const voting = this.topic();
      if (this.hasVotedState()) {
        const castedPreference = voting.voteOf(Meteor.userId());
        preference = castedPreference.map(function obj(value) { return { text: voting.vote.choices[value], value }; });
      } else { // no vote yet, preference is then the original vote choices in that order
        preference = voting.vote.choices.map(function obj(text, index) { return { text, value: index }; });
      }
      this.preference(preference);
    },
    function enableDisableSortableState() {
      this.templateInstance.$('.sortable')
        .sortable((this.hasVotedState() && this.temporaryVote() === undefined) ? 'disable' : 'enable');
    },
    function openCloseEnvelope() {
      if (this.hasVotedState() && this.templateInstance.firstRun) {
        this.templateInstance.voteEnvelope.closed();
      }
      if (!this.hasVotedState() && this.templateInstance.firstRun) {
        this.templateInstance.voteEnvelope.opened();
      }
      if (this.hasVotedState() && !this.templateInstance.firstRun && _.isUndefined(this.temporaryVote())) {
        this.templateInstance.voteEnvelope.close();
      }
      if (this.hasVotedState() && !this.templateInstance.firstRun && _.isDefined(this.temporaryVote())) {
        this.templateInstance.voteEnvelope.open();
      }
      this.templateInstance.firstRun = false;
    },
  ],

  /*indirectUser() {
    const myVotePath = this.votePaths[Meteor.userId()];
    const myFirstDelegateId = myVotePath[1];
    const myFirstDelegate = Meteor.users.findOne(myFirstDelegateId);
    return myFirstDelegate;
  },*/
  originalState() {
    if (!this.hasVotedState() && this.temporaryVote() === undefined) return true;
    return false;
  },
  votingState() {
    if (!this.hasVotedState() && _.isDefined(this.temporaryVote())) return true;
    return false;
  },
  castedVoteState() {
    if (this.hasVotedState() && this.temporaryVote() === undefined) return true;
    return false;
  },
  modifyState() {
    if (this.hasVotedState() && _.isDefined(this.temporaryVote())) return true;
    return false;
  },
  voterAvatar() {
    const userId = Meteor.userId();
    const user = Meteor.users.findOne(userId);
    if (this.topic().hasVotedDirect(userId)) {
      return user.avatar;
    }
    if (this.topic().hasVotedIndirect(userId)) {
      const myVotePath = this.topic().votePaths[Meteor.userId()];
      const myFirstDelegateId = myVotePath[1];
      const myFirstDelegate = Meteor.users.findOne(myFirstDelegateId);
      return myFirstDelegate.avatar;
    }
    return undefined;
  },
  isButtonLayoutVertical() {
    return this.topic().vote.type === 'preferential';
  },
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    const userId = Meteor.userId();
    const votedChoice = this.topic().voteOf(userId);
    if (this.votingState() || this.modifyState()) return choice === this.temporaryVote() && 'btn-pressed';
    if (this.castedVoteState()) return _.isEqual(votedChoice, [choice]) && 'btn-pressed';
    return undefined;
  },
  // Preferential voting
  currentPreference() {
    if (this.votingState() || this.modifyState()) {
      return this.temporaryVote();
    }
    if (this.castedVoteState() || this.originalState()) {
      return this.preference();
    }
    return undefined;
//  console.log('ondisplay:', preference);
  },
  voteOfUser() {
    return this.topic().voteOf(Meteor.userId());
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
  events: {
    // event handler for the single choice vote type
    'click .btn-vote'(event, instance) {
      if (this.votingState() || this.modifyState() || this.originalState()) {
        this.temporaryVote($(event.target).closest('.btn').data('value'));
      } else {
        return;
      }
    },
    'click .send-button'(event, instance) {
      const topicId = this.topic()._id;
      if (this.topic().vote.type === 'preferential') {
        if (this.votingState() || this.modifyState()) {
          const preference = this.temporaryVote();
          const castedVote = preference.map(p => p.value);
          castVoteBasedOnPermission(topicId, castedVote,
            onSuccess((res) => {
              displayMessage('success', 'Vote casted');
            })
          );
        }
      } else {
        castVoteBasedOnPermission(topicId, [this.temporaryVote()],
          onSuccess(res => displayMessage('success', 'Vote casted'))
        );
      }
      this.temporaryVote(undefined);
    },
    'click .js-modify'(event, instance) {
      const userId = Meteor.userId();
      if (this.temporaryVote()) {
        this.temporaryVote(undefined);
      } else if (this.hasVotedState()) {
        if (this.topic().vote.type === 'preferential') {
          this.temporaryVote(this.preference());
        } else {
          this.temporaryVote(this.topic().voteOf(userId)[0]);
        }
      }
    },
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
