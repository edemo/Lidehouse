import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { voteColumns } from '/imports/api/topics/votings/tables.js';

import './vote-topics.html';
import '../components/vote-create.js';
import '../components/votebox.js';

Template.Vote_topics.onCreated(function voteTopicsOnCreated() {
});

Template.Vote_topics.helpers({
  openVoteTopics() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'vote', closed: false });
  },
  reactiveTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'vote', closed: true }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: voteColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
  hasSelection() {
    return !!Session.get('selectedTopicId');
  },
  selectedDoc() {
    return Topics.findOne(Session.get('selectedTopicId'));
  },
});

Template.Vote_topics.events({
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedTopicId', id);
  },
  'click .js-new-vote, click .js-vote-nope'(event) {
    $('.js-new-vote')[0].classList.toggle('hidden');
  },
});
