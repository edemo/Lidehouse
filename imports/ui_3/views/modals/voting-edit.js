import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { afId2details } from '/imports/ui_3/views/modals/autoform-modal.js';
import { Clock } from '/imports/utils/clock';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import '/imports/ui_3/views/components/shareddoc-display.js';
import './voting-edit.html';

export let votingEditInstance;

// TODO: We need to access the autoform data context. Is there a better way than a fixed parent number?
function autoformDataContext() { return Template.parentData(4); }

function getTopicId() {
  const doc = autoformDataContext().doc;
  const topicId = (doc && doc._id)
    ? doc._id
    : Meteor.userId();  // temporary placeholder until we have the topicId (we replace in onSuccess)
  return topicId;
}

Template.Voting_edit.onCreated(function () {
  const instance = Template.instance();
  instance.choices = new ReactiveVar([]);
  votingEditInstance = instance;
  const actionName = afId2details(autoformDataContext().id).action;
  this.autorun(() => {
    const currentVoteType = AutoForm.getFieldValue('vote.type', `af.vote.${actionName}`);
    const newChoices = currentVoteType && Votings.voteTypes[currentVoteType].fixedChoices;
    if (newChoices) instance.choices.set(newChoices);
  });
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const topicId = getTopicId();
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Voting_edit.onRendered(function () {
  const instance = Template.instance();
  const doc = autoformDataContext().doc;
  if (doc && doc.vote) instance.choices.set(doc.vote.choices);
});

Template.Voting_edit.helpers({
  // Default values for insert autoForm: https://github.com/aldeed/meteor-autoform/issues/210
  defaultOpenDate() {
    return Clock.currentTime();
  },
  defaultCloseDate() {
    return moment().add(15, 'day').toDate();
  },
  agendaOptions() {
    const communityId = ModalStack.getVar('communityId');
    const agendas = Agendas.find({ communityId });
    return agendas.map(function option(a) { return { label: a.title, value: a._id }; });
  },
  choices() {
    const instance = Template.instance();
    return instance.choices.get();
  },
  attachments() {
    const topicId = getTopicId();
    return Shareddocs.find({ topicId });
  },
  updateForm() {
    const afType = ModalStack.getVar('autoformType');
    return afType === 'update' || afType === 'method-update';
  },
});

Template.Voting_edit.events({
  'click .js-remove-choice'(event) {
    const currentChoices = Template.instance().choices.get();
    const removeIndex = $(event.target).data('index');
    currentChoices.splice(removeIndex, 1);
    Template.instance().choices.set(currentChoices);
  },
  'keyup .js-enter-choice'(event) {
    if (event.keyCode == 13) {
      let currentChoices = Template.instance().choices.get();
      const newChoice = $('.editing input')[0].value;
      currentChoices = currentChoices.concat(newChoice);
      Template.instance().choices.set(currentChoices);
      $('.js-enter-choice').val('');
      $('.editing')[0].classList.toggle('hidden');
      $('.js-add-choice')[0].classList.toggle('hidden');
    }
  },
  'click .js-add-choice'(event) {
    if ($(event.target).hasClass('disabled')) return;
    $('.editing')[0].classList.toggle('hidden');
    $('.js-add-choice')[0].classList.toggle('hidden');
    $('.js-enter-choice').focus();
  },
  'click .js-upload'(event) {
    const topicId = getTopicId();
    Shareddocs.upload({
      communityId: ModalStack.getVar('communityId'),
      folderId: 'voting',
      topicId,
    });
  },
});
