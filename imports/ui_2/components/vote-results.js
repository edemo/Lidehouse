import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { onSuccess, displayMessage } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { update } from '/imports/api/topics/methods.js';
import { castVote } from '/imports/api/topics/votings/methods.js';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { voteResultsColumns } from '/imports/api/topics/votings/tables.js';

import '../components/vote-results.html';

Template.Vote_results.onCreated(function voteboxOnCreated() {
});

Template.Vote_results.onRendered(function voteboxOnRendered() {
});

Template.Vote_results.helpers({
  dataFn() {
    return () => {
      return this.voteResultSummary().results;
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: voteResultsColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
  summary() {
    const summary = this.voteResultSummary().summary;
    return Object.keys(summary).map(key => {
      return { vote: this.vote.choices[key], percentage: summary[key] }
    });
  },
});

Template.Vote_results.events({
});
