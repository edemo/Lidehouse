import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
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
      return this.voteResultsDisplay();
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
