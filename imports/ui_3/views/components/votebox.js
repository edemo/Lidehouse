/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
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
import './vote-cast-panel.js';
import './votebox.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Votebox.onCreated(function voteboxOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const topicId = this.data._id;
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Votebox.onRendered(function voteboxOnRendered() {
  const topicId = this.data._id;
  const vote = this.data.vote;
  // Filling the chart with data
  this.autorun(() => {
    const voting = Topics.findOne(topicId);
    const voteSummary = voting.voteSummary;
    if (!voteSummary) return; // Results come down in a different sub, so it might not be there just yet

    if (voting.closed) {
      const barData = {
        labels: vote.choices.map(c => `${__(c)}`),
        datasets: [{
          label: __('Support'),
          data: vote.choices.map((c, i) => voteSummary[i]),
          backgroundColor: choiceColors[2],
          borderWidth: 2,
        }],
      };
      const voteSummaryDisplay = voting.voteSummaryDisplay();
      const doughnutData = {
        labels: voteSummaryDisplay.map(s => `${__(s.choice)}`), // .concat(__('Not voted')),
        datasets: [{
          data: voteSummaryDisplay.map((s, i) => s.votingUnits), // .concat(voting.notVotedUnits()),
          backgroundColor: voteSummaryDisplay.map((s, i) => choiceColors[i]), // .concat(notVotedColor),
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
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  attachments() {
    return Shareddocs.find({ topicId: this._id });
  },
});

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
