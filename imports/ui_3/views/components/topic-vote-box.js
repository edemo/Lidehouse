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
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Comments } from '/imports/api/comments/comments.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { afVoteStatusChangeModal } from '/imports/ui_3/views/modals/voting-edit.js';
import '/imports/ui_3/views/components/vote-results.js';
import '../components/select-voters.js';
import './topic-box.js';
import './vote-cast-panel.js';
import './topic-vote-box.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Topic_vote_body.onCreated(function voteboxOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const topicId = this.data._id;
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Topic_vote_body.onRendered(function voteboxOnRendered() {
  const topicId = this.data._id;
  const vote = this.data.vote;
  this.chart = null;
  // Filling the chart with data
  this.autorun(() => {
    const voting = Topics.findOne(topicId);
    const voteSummary = voting.voteSummary;
    if (!voteSummary) return; // Results come down in a different sub, so it might not be there just yet

    if (voting.votingClosed()) {
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
      const chartData = (vote.type === 'preferential' || vote.type === 'multiChoose') ? barData : doughnutData;
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
      };
      const elem = document.getElementById('chart-' + voting._id).getContext('2d');
      const chartType = (vote.type === 'preferential' || vote.type === 'multiChoose') ? 'bar' : 'doughnut';
      if (this.chart) { this.chart.destroy(); }
      this.chart = new Chart(elem, { type: chartType, data: chartData, options: chartOptions });
    }
  });
});

Template.Topic_vote_body.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  attachments() {
    return Shareddocs.find({ topicId: this._id });
  },
});

Template.Topic_vote_header.events({
  'click .vote .js-edit'(event) {
    const voting = Topics.findOne(this._id);
    Modal.show('Voting_edit', {
      id: 'af.vote.update',
      collection: Topics,
      schema: Votings.schema,
      type: 'method-update',
      meteormethod: 'topics.update',
      singleMethodArgument: true,
      doc: voting,
    });
  },
  'click .vote .js-delete'(event) {
    Modal.confirmAndCall(removeTopic, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
  'click .vote .js-status-change'(event) {
    const id = this._id;
    const status = $(event.target).closest('[data-status]').data('status');
    if (status === 'votingFinished') {
      const serverTimeNow = new Date(TimeSync.serverTime());
      const closureDate = moment(this.closesAt).from(serverTimeNow);
      const message = __('The planned date of closure was ') + closureDate;
      afVoteStatusChangeModal(id, status, message);
    } else {
      afVoteStatusChangeModal(id, status);
    }
  },
});
