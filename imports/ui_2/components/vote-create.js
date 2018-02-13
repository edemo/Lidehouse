import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { votingsExtensionSchema } from '/imports/api/topics/votings/votings.js';
import './vote-create.html';

let afVotingInsertInstance;

Template.Vote_create.onCreated(function () {
  const instance = Template.instance();
  instance.choices = new ReactiveVar([]);
  this.autorun(() => {
    const currentVoteType = AutoForm.getFieldValue('vote.type', 'af.voting.insert');
//    Tracker.nonreactive(() => {
    const newChoices = Topics.voteTypeChoices[currentVoteType] || [];
    instance.choices.set(newChoices);
//    });
  });
});

Template.Vote_create.onRendered(function () {
  afVotingInsertInstance = Template.instance();
});

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
    const currentVoteType = AutoForm.getFieldValue('vote.type');
    return !!(Topics.voteTypeChoices[currentVoteType]);
  },
  choices() {
    const instance = Template.instance();
    return instance.choices.get();
  },
});

Template.Vote_create.events({
  'click .js-remove-choice'(event) {
    const currentChoices = Template.instance().choices.get();
    const removeIndex = $(event.target).data('index');
    currentChoices.splice(removeIndex, 1);
    Template.instance().choices.set(currentChoices);
 //   Session.set('newVotingChoices', currentChoices);
  },
  'click .js-enter-choice'(event) {
    let currentChoices = Template.instance().choices.get();
    const newChoice = $('.editing input')[0].value;
    currentChoices = currentChoices.concat(newChoice);
    Template.instance().choices.set(currentChoices);
//    Session.set('newVotingChoices', currentChoices);
    $('.editing')[0].classList.toggle('hidden');
    $('.js-add-choice')[0].classList.toggle('hidden');
  },
  'click .js-add-choice'(event) {
    $('.editing')[0].classList.toggle('hidden');
    $('.js-add-choice')[0].classList.toggle('hidden');
  },
});

AutoForm.addModalHooks('af.voting.insert');
AutoForm.addHooks('af.voting.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'vote';
//    doc.vote.choices = afVotingInsertInstance.choices.get();
    return doc;
  },
});
