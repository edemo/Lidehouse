/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
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
          const choiceList = instance.$('.sortable').sortable('toArray', { attribute: 'data-value' });
          self.temporaryVote(choiceList);
        },
      });
    }

    instance.voteEnvelope = createEnvelope(instance.$('.letter-content'));
  },
  registeredVote() {
    return this.topic().voteOf(Meteor.userId());
  },
  autorun: [
    function maintainLiveData() {
      this.topic(Topics.findOne(this.templateInstance.data._id));
    },
    function enableDisableSortableState() {
      this.templateInstance.$('.sortable').sortable(
        (this.registeredVote() && !this.temporaryVote()) ? 'disable' : 'enable'
      );
    },
    function openCloseEnvelope() {
      if (this.templateInstance.firstRun && this.registeredVote() && !this.temporaryVote()) {
        this.templateInstance.voteEnvelope.closed();
      }
      if (this.templateInstance.firstRun && !this.registeredVote()) {
        this.templateInstance.voteEnvelope.opened();
      }
      if (!this.templateInstance.firstRun && this.registeredVote() && !this.temporaryVote()) {
        this.templateInstance.voteEnvelope.close();
      }
      if (!this.templateInstance.firstRun && this.registeredVote() && this.temporaryVote()) {
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
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    if (this.temporaryVote()) return _.isEqual([choice], this.temporaryVote()) && 'btn-pressed';
    if (this.registeredVote()) return _.isEqual([choice], this.registeredVote()) && 'btn-pressed';
    return undefined;
  },
  // Preferential voting
  preference() {
    const choices = this.topic().vote.choices;
    if (this.temporaryVote()) {
      return this.temporaryVote().map(function obj(value) { return { text: choices[value], value }; });
    } else if (this.registeredVote()) {
      return this.registeredVote().map(function obj(value) { return { text: choices[value], value }; });
    }
    // no vote yet, preference is then the original vote choices in that order
    return choices.map(function obj(text, index) { return { text, value: index }; });
  },
  textForVote() {
    // originalState
    if (!this.registeredVote() && !this.temporaryVote()) return 'originalState';
    // votingState
    if (!this.registeredVote() && this.temporaryVote()) return 'votingState';
    // castedVoteState
    if (this.registeredVote() && !this.temporaryVote()) return 'Modify vote';
    // modifyState
    if (this.registeredVote() && this.temporaryVote()) return 'Cancel';
  },
  events: {
    'click .btn-vote'(event, instance) {  // event handler for the single choice vote type
      if (this.registeredVote() && !this.temporaryVote()) return;
      const selecetedChoice = $(event.target).closest('.btn').data('value');
      this.temporaryVote([selecetedChoice]);
    },
    'click .btn-send-vote'(event, instance) {
      const topicId = this.topic()._id;
      debugAssert(this.temporaryVote());
      castVoteBasedOnPermission(topicId, this.temporaryVote(),
        onSuccess((res) => {
          displayMessage('success', 'Vote casted');
        })
      );
      this.temporaryVote(undefined);
    },
    'click .js-modify'(event, instance) {
      if (this.temporaryVote()) {
        this.temporaryVote(undefined);
      } else if (this.registeredVote()) {
        this.temporaryVote(this.registeredVote());
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
