/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote } from '/imports/api/topics/votings/methods.js';
import { Partners } from '/imports/api/partners/partners.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { getActivePartnerId } from '/imports/ui_3/lib/active-partner.js';
import { toggle } from '/imports/api/utils.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../components/select-voters.js';
import './vote-cast-panel.html';
import { createEnvelope } from './envelope.js';


function castVoteBasedOnPermission(topicId, castedVote, callback) {
  ModalStack.setVar('relation', 'member', true);
  const community = getActiveCommunity();
  const communityId = community._id;
  if (Meteor.user().hasPermission('vote.castForOthers', { communityId }) && community.hasLiveAssembly()) {
    const modalContext = {
      title: 'Proxy voting',
      body: 'Select_voters',
      bodyContext: { topicId, castedVote },
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
    const activePartnerId = getActivePartnerId();
    return this.topic().voteOf(activePartnerId);
  },
  autorun: [
    function maintainLiveData() {
      this.topic(Topics.findOne(this.templateInstance.data._id));
    },
    function enableDisableSortableState() {
      this.templateInstance.$('.sortable').sortable(
        (this.topic().status !== 'opened' || (this.registeredVote() && !this.temporaryVote())) ? 'disable' : 'enable'
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
  voterAvatar() {
    const activePartnerId = getActivePartnerId();
    if (this.topic().hasVotedDirect(activePartnerId)) {
      const partner = Partners.findOne(activePartnerId);
      return partner.avatar();
    }
    if (this.topic().hasVotedIndirect(activePartnerId)) {
      const myVotePath = this.topic().votePaths[activePartnerId];
      const myFirstDelegateId = myVotePath[1];
      const myFirstDelegate = Partners.findOne(myFirstDelegateId);
      return myFirstDelegate.avatar();
    }
    return undefined;
  },
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    if (this.temporaryVote()) return this.temporaryVote().includes(choice) && 'btn-pressed';
    if (this.registeredVote()) return this.registeredVote().includes(choice) && 'btn-pressed';
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
  events: {
    'click .btn-vote'(event, instance) {  // event handler for the single and multiChoose vote types
      if (this.registeredVote() && !this.temporaryVote()) return;
      const selectedChoice = $(event.target).closest('.btn').data('value');
      if (instance.data.vote.type === 'multiChoose') this.temporaryVote(toggle(selectedChoice, this.temporaryVote()));
      else this.temporaryVote([selectedChoice]);
    },
    'click .js-send'(event, instance) {
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
