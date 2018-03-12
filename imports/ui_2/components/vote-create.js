import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { votingsExtensionSchema } from '/imports/api/topics/votings/votings.js';
import './vote-create.html';

let afVoteCreateInstance;

Template.Vote_create.onCreated(function () {
  const instance = Template.instance();
  instance.choices = new ReactiveVar([]);
  this.autorun(() => {
    const currentVoteType = AutoForm.getFieldValue('vote.type', 'af.vote.create');
    const newChoices = Topics.voteTypeChoices[currentVoteType] || [];
    instance.choices.set(newChoices);
  });
  afVoteCreateInstance = instance;
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
  // Default values for insert autoForm: https://github.com/aldeed/meteor-autoform/issues/210
  defaultOpenDate() {
    return new Date();
  },
  defaultCloseDate() {
    return moment().add(15, 'day').toDate();
  },
  agendaOptions() {
    const communityId = Session.get('activeCommunityId');
    const agendas = Agendas.find({ communityId });
    return agendas.map(function option(a) { return { label: a.title, value: a._id }; });
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
  },
  'click .js-enter-choice'(event) {
    let currentChoices = Template.instance().choices.get();
    const newChoice = $('.editing input')[0].value;
    currentChoices = currentChoices.concat(newChoice);
    Template.instance().choices.set(currentChoices);
    $('.editing')[0].classList.toggle('hidden');
    $('.js-add-choice')[0].classList.toggle('hidden');
  },
  'click .js-add-choice'(event) {
    $('.editing')[0].classList.toggle('hidden');
    $('.js-add-choice')[0].classList.toggle('hidden');
  },
});

AutoForm.addModalHooks('af.vote.create');
AutoForm.addHooks('af.vote.create', {
  formToDoc(doc) {
    Tracker.nonreactive(() => {   // AutoForm will run the formToDoc each time any field on the form, like the vote.type is simply queried (maybe so that if its a calculated field, it gets calculated)
      doc.createdAt = new Date();
      doc.communityId = Session.get('activeCommunityId');
      doc.userId = Meteor.userId();
      doc.category = 'vote';
      doc.vote.choices = afVoteCreateInstance.choices.get();
    });
    return doc;
  },
});
