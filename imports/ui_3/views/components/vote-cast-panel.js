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
  this.state.set('choice', undefined);
  this.state.set('isNotInModifyState', true);
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
      state.set('preference', preference);
    },
  });

  // this is in an autorun, so if logged in user changes, it will rerun
  // or if the vote is changed on another machine, it also gets updated here

  this.autorun(function update() {

    const voting = Topics.findOne(topicId);
    const voteIsFinalized = voting.hasVoted(Meteor.userId());
    state.set('voteIsFinalized', voteIsFinalized);
    let preference;
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (voteIsFinalized || !isNotInModifyState) {
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
    const voteIsFinalized = state.get('voteIsFinalized');
    const isNotInModifyState = state.get('isNotInModifyState');
    $(self.find('.sortable')).sortable((voteIsFinalized && isNotInModifyState) ? 'disable' : 'enable');
   /* const voting = Topics.findOne(topicId);
    const hasVoted = voting.hasVoted(Meteor.userId());
    $(Template.instance().find('.sortable')).sortable(hasVoted ? 'disable' : 'enable');
  */
  });

  const voteEnvelope = createEnvelope(this.$('.letter-content'));

  if (state.get('voteIsFinalized')) voteEnvelope.closed();
  if (state.get('voteIsFinalized') === false) voteEnvelope.opened();

  this.autorun(() => {
    if (state.get('voteIsFinalized') && state.get('isNotInModifyState') && state.get('choice') !== undefined) voteEnvelope.close();
    if (state.get('voteIsFinalized') && state.get('isNotInModifyState') === false && state.get('choice') !== undefined) voteEnvelope.open();
  });

});

Template.Vote_cast_panel.helpers({
  indirectUser() {
    const myVotePath = this.votePaths[Meteor.userId()];
    const myFirstDelegateId = myVotePath[1];
    const myFirstDelegate = Meteor.users.findOne(myFirstDelegateId);
    return myFirstDelegate;
  },
  isButtonLayoutVertical() {
    return this.vote.type === 'preferential';
  },
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    const userId = Meteor.userId();
    const votedChoice = this.voteOf(userId);
    const voteIsFinalized = Template.instance().state.get('voteIsFinalized');
    const temporaryChoice = Template.instance().state.get('choice');
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (voteIsFinalized && isNotInModifyState) return _.isEqual(votedChoice, [choice]) && 'btn-pressed';
    return choice === temporaryChoice && 'btn-pressed';
  },
  // Preferential voting
  currentPreference() {
    const preference = Template.instance().state.get('preference');
//  console.log('ondisplay:', preference);
    return preference;
  },
  voteOfUser() {
    return this.voteOf(Meteor.userId());
  },
  voteIsFinalized() {
    return Template.instance().state.get('voteIsFinalized');
    //const hasVoted = this.hasVoted(Meteor.userId());
   // return hasVoted;
  },
  isNotInModifyState() {
    return Template.instance().state.get('isNotInModifyState');
  },
  stateClassForSendButton() {
    const voteIsFinalized = Template.instance().state.get('voteIsFinalized');
    const temporaryChoice = Template.instance().state.get('choice');
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (_.isDefined(temporaryChoice) && (!voteIsFinalized || !isNotInModifyState)) return 'visible-button';
    return 'invisible-button';
  },
  textForVote() {
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (isNotInModifyState) return 'Modify vote';
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
    const voteIsFinalized = Template.instance().state.get('voteIsFinalized');
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (!voteIsFinalized || !isNotInModifyState) {
      Template.instance().state.set('choice', $(event.target).closest('.btn').data('value'));
    } else {
      return;
    }
  },
  'click .send-button'(event, instance) {
    const topicId = this._id;
    if (this.vote.type === 'preferential') {
      const voteIsFinalized = instance.state.get('voteIsFinalized');
      const isNotInModifyState = instance.state.get('isNotInModifyState');
      if (!voteIsFinalized || !isNotInModifyState) {
        const preference = instance.state.get('preference');
        const castedVote = preference.map(p => p.value);
        castVoteBasedOnPermission(topicId, castedVote,
          onSuccess((res) => {
            displayMessage('success', 'Vote casted');
          })
        );
        Template.instance().state.set('isNotInModifyState', true);
      } else { // voteIsFinalized === true
        // instance.state.set('voteIsFinalized', false);
      }
    } else {
      const temporaryChoice = Template.instance().state.get('choice');
      castVoteBasedOnPermission(topicId, [temporaryChoice],
        onSuccess(res => displayMessage('success', 'Vote casted'))
      );
      Template.instance().state.set('isNotInModifyState', true);
    }
  },
  'mousedown .btn-vote-choice'() {
    Template.instance().state.set('choice', 1);
  },
  'click .js-modify'() {
    const userId = Meteor.userId();
    const isNotInModifyState = Template.instance().state.get('isNotInModifyState');
    if (!isNotInModifyState) {
      Template.instance().state.set('isNotInModifyState', true);
      Template.instance().state.set('choice', false);
    }
    if (isNotInModifyState) {
      Template.instance().state.set('isNotInModifyState', false);
      Template.instance().state.set('choice', this.voteOf(userId)[0]);
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
