/* globals document Waypoint */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
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
    const communityId = ModalStack.getVar('communityId');
    const topicId = this.data._id;
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Topic_vote_body.onRendered(function () {
  const self = this;
  const doc = this.data;
  this.waypoint = new Waypoint({
    element: this.find('.progress-bar'),
    handler() {
      self.autorun(() => {
        const votedPercent = Topics.findOne(doc._id)?.votedPercent().toFixed(2);
        self.$('.progress-bar').css('width', votedPercent + '%');
      });
      return self.waypoint && self.waypoint.disable();
    },
   // context: document.getElementById('wrapper'), // needed if wrapper height is 100vh for webview
    offset: '80%',
  });
});

Template.Topic_vote_body.onDestroyed(function () {
  this.waypoint.destroy();
});

Template.Topic_vote_body.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  adderName(userId) {
    if (!userId) return undefined;
    const user = Meteor.users.findOne(userId);
    return user?.displayOfficialName();
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
    const voteData = voteSummaryDisplay.map((s) => s.percentOfVotes);
    const shortenedLabel = function shortenedLabel(text) {
      if (voteData.length > 9 && text.length > 12) return text.substr(0, 11) + '...';
      else if (text.length < 21) return text;
      return text.substr(0, 19) + '...';
    };
    const barData = {
      labels: voteSummaryDisplay.map(s => `${shortenedLabel(__(s.choice))}`),
      datasets: [{
        label: __('Support'),
        data: voteData,
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
