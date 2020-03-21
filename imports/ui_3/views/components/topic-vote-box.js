/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/votings/methods.js';
import '/imports/api/topics/votings/actions.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/vote-results.js';
import '/imports/ui_3/views/components/select-voters.js';
import '/imports/ui_3/views/components/topic-box.js';
import '/imports/ui_3/views/components/vote-cast-panel.js';
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

Template.Topic_vote_body.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  chartType() {
    const vote = this.vote;
    const chartType = (vote.type === 'preferential' || vote.type === 'multiChoose') ? 'bar' : 'doughnut';
    return chartType;
  },
  chartData() {
    const vote = this.vote;
    const topicId = this._id;
    const voting = Topics.findOne(topicId);
    const voteSummary = voting.voteSummary;
    if (!voteSummary) return; // Results come down in a different sub, so it might not be there just yet
    const voteSummaryDisplay = voting.voteSummaryDisplay();
    const doughnutData = {
      labels: voteSummaryDisplay.map(s => `${__(s.choice)}`), // .concat(__('Not voted')),
      datasets: [{
        data: voteSummaryDisplay.map((s, i) => s.votingUnits), // .concat(voting.notVotedUnits()),
        backgroundColor: voteSummaryDisplay.map((s, i) => choiceColors[i]), // .concat(notVotedColor),
      }],
    };
    const barData = {
      labels: vote.choices.map(c => `${__(c)}`),
      datasets: [{
        label: __('Support'),
        data: vote.choices.map((c, i) => voteSummary[i]),
        backgroundColor: choiceColors[2],
        borderWidth: 2,
      }],
    };
    const chartData = (vote.type === 'preferential' || vote.type === 'multiChoose') ? barData : doughnutData;
    return chartData;
  },
  chartOptions() {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    return chartOptions;
  },
});
