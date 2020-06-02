import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { voteResultsColumns } from '/imports/api/topics/votings/tables.js';

import '../components/vote-results.html';

Template.Vote_results.onCreated(function () {
});

Template.Vote_results.onRendered(function () {
});

Template.Vote_results.helpers({
  dataFn() {
    return () => {
      const voting = Topics.findOne(this._id);
      return voting.voteResultsDisplay();
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: voteResultsColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: true,
        paging: false,
        info: false,
      };
    };
  },
});

Template.Vote_results.events({
});
