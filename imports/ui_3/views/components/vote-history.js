import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { __ } from '/imports/localization/i18n.js';
import { onSuccess, handleError } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';

import './vote-history.html';


Template.Vote_history.helpers({
  revision() {
    return this.revision;
  },
  sortedRevisions() {
    return _.sortBy(this.revision, 'replaceDate').reverse();
  },

});

Template.Vote_history.events({

});
