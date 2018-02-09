import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { votingsExtensionSchema } from '/imports/api/topics/votings/votings.js';
import './vote-create.html';

Template.Vote_create.helpers({
  collection() {
    return Topics;
  },
  schema() {
    const schema = new SimpleSchema([
      Topics.simpleSchema(),
    ]);
    schema.i18n('schemaVotings');
    return schema;
  },
  needsChoicesSpecified() {
    const voteType = AutoForm.getFieldValue('vote.type');
    switch (voteType) {
      case undefined: return false;
      case 'petition': return false;
      case 'yesno': return false;
      case 'choose': return true;
      case 'preferential': return true;
      default: debugAssert(false); return false;
    }
  },
});

Template.Vote_create.onCreated(function voteCreateOnCreated() {
});
/*
Template.Vote_create.events({
  'click .js-answer, click .js-add-answer'(event) {
    $('.choice-form')[0].classList.toggle('hidden');
    $('.js-answer')[0].classList.toggle('hidden');
  },
});
*/
AutoForm.addModalHooks('af.voting.insert');
AutoForm.addHooks('af.voting.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'vote';
    return doc;
  },
});
