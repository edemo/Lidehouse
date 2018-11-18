/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveDict } from 'meteor/reactive-dict';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/voting-edit.js';
import '/imports/ui_3/views/components/vote-results.js';
import '../components/select-voters.js';
import './votebox.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Votebox.onCreated(function voteboxOnCreated() {
  this.state = new ReactiveDict();
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const topicId = this.data._id;
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Votebox.onRendered(function voteboxOnRendered() {
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
    if (voteIsFinalized) {
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
    $(self.find('.sortable')).sortable(voteIsFinalized ? 'disable' : 'enable');
   /* const voting = Topics.findOne(topicId);
    const hasVoted = voting.hasVoted(Meteor.userId());
    $(Template.instance().find('.sortable')).sortable(hasVoted ? 'disable' : 'enable');
  */
 });
  // Filling the chart with data
  this.autorun(() => {
    const voting = Topics.findOne(topicId);
    if (voting.closed) {
      const barData = {
        labels: vote.choices.map(c => `${__(c)}`),
        datasets: [{
          label: __('Support'),
          data: vote.choices.map((c, i) => voting.voteSummary[i]),
          backgroundColor: choiceColors[2],
          borderWidth: 2,
        }],
      };
      const doughnutData = {
        labels: vote.choices.map(c => `${__(c)}`).concat(__('Not voted')),
        datasets: [{
          data: vote.choices.map((c, i) => voting.voteSummary[i]).concat(voting.notVotedUnits()),
          backgroundColor: vote.choices.map((c, i) => choiceColors[i]).concat(notVotedColor),
        }],
      };
      const chartData = (vote.type === 'preferential') ? barData : doughnutData;
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
      };
      const elem = document.getElementById('chart-' + voting._id).getContext('2d');
      const chartType = (vote.type === 'preferential') ? 'bar' : 'doughnut';
      new Chart(elem, { type: chartType, data: chartData, options: chartOptions });
    }
  });
});

Template.Votebox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  isButtonLayoutVertical() {
    return this.vote.type === 'preferential';
  },
  // Single choice voting
  pressedClassForVoteBtn(choice) {
    const userId = Meteor.userId();
    const voteOfUser = this.voteOf(userId);
    return _.isEqual(voteOfUser, [choice]) && 'btn-pressed';
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
  attachments() {
    return Shareddocs.find({ topicId: this._id });
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

Template.Votebox.events({
  'click .js-edit'(event) {
    const votingSchema = new SimpleSchema([
      Topics.simpleSchema(),
    ]);
    votingSchema.i18n('schemaVotings');
    const voting = Topics.findOne(this._id);
    Modal.show('Voting_edit', {
      id: 'af.vote.update',
      collection: Topics,
      schema: votingSchema,
      type: 'method-update',
      meteormethod: 'topics.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
      doc: voting,
    });
  },
  'click .js-delete'(event) {
    Modal.confirmAndCall(removeTopic, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
  'click .btn-golive'(event) {
    const modalContext = {
      title: 'Live voting',
      body: 'Votebox',
      bodyContext: _.extend(this, { live: true }),
      btnClose: 'cancel',
      btnOK: 'send vote',
    };
    Modal.show('Modal', modalContext);
  },
  // event handler for the single choice vote type
  'click .btn-vote'(event) {
    const topicId = this._id;
    const choice = $(event.target).closest('.btn').data('value');
    castVoteBasedOnPermission(topicId, [choice],
      onSuccess(res => displayMessage('success', 'Vote casted'))
    );
  },
  // event handler for the preferential vote type
  'click .btn-vote-finalize'(event, instance) {
    const topicId = this._id;
    const voteIsFinalized = instance.state.get('voteIsFinalized');
    if (!voteIsFinalized) {
      const preference = instance.state.get('preference');
      const castedVote = preference.map(p => p.value);
      castVoteBasedOnPermission(topicId, castedVote,
        onSuccess((res) => {
          displayMessage('success', 'Vote casted');
        })
      );
    } else { // voteIsFinalized === true
      instance.state.set('voteIsFinalized', false);
    }
  },
  'click .js-revoke'(event) {
    const topicId = this._id;
    const vote = [];  // indicates a no-vote
    castVote.call({ topicId, castedVote: vote },
      onSuccess(res => displayMessage('success', 'Vote revoked'))
    );
  },
  'click .js-close'(event, instance) {
    const serverTimeNow = new Date(TimeSync.serverTime());
    const closureDate = moment(this.vote.closesAt).from(serverTimeNow);
    Modal.confirmAndCall(closeVote, { topicId: this._id }, {
      action: 'close vote',
      message: __('The planned date of closure was ') + closureDate, 
    });
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
