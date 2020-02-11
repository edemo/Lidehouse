import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { choosePartner } from '/imports/api/partners/partners.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import './select-voters.html';

Template.Select_voters.onCreated(function selectVotersOnCreated() {
});

Template.Select_voters.onRendered(function selectVotersOnRendered() {
});

Template.Select_voters.helpers({
  schema() {
    const schema = new SimpleSchema({
      voters: { type: Array },
      'voters.$': { type: String /* userId or IdCard identifier */, autoform: choosePartner },
    });
    schema.i18n('schemaVotings.vote');
    return schema;
  },
});

Template.Select_voters.events({
});
