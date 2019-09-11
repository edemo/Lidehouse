import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { initializeHelpIcons } from '/imports/ui_3/views/blocks/help-icon.js';
import { Clock } from '/imports/utils/clock';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Comments } from '/imports/api/comments/comments.js';
import { fixedStatusValue } from '/imports/ui_3/views/components/tickets-edit.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import '/imports/ui_3/views/components/shareddoc-display.js';
import './voting-edit.html';


export let votingEditInstance;

function getTopicId(afData) {
  const topicId = afData.doc
    ? afData.doc._id
    : Meteor.userId();  // temporary placeholder until we have the topicId (we replace in onSuccess)
  return topicId;
}

Template.Voting_edit.actionFromId = function () {
  const instance = Template.instance();
  const split = instance.data.id.split('.'); // AutoFormId convention is 'af.object.action'
  const objectName = split[1];
  const actionName = split[2];
  return actionName;
};

Template.Voting_edit.onCreated(function () {
  Session.set('autoformType', this.data.type);
  const instance = Template.instance();
  instance.choices = new ReactiveVar([]);
  votingEditInstance = instance;
  this.autorun(() => {
    const currentVoteType = AutoForm.getFieldValue('vote.type', `af.vote.${Template.Voting_edit.actionFromId()}`);
    const newChoices = currentVoteType && Votings.voteTypes[currentVoteType].fixedChoices;
    if (newChoices) instance.choices.set(newChoices);
  });
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const topicId = getTopicId(Template.instance().data);
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
});

Template.Voting_edit.onRendered(function () {
  initializeHelpIcons(this, 'schemaVotings');
});

Template.Voting_edit.helpers({
  title() {
    if (this.title) return this.title;
    const actionName = Template.Voting_edit.actionFromId();
    if (actionName === 'insert') return __('new') + ' ' + __('topic.vote');
    else if (actionName === 'update') return __('topic.vote') + ' ' + __('editing data');
    else if (actionName === 'view') return __('topic.vote') + ' ' + __('viewing data');
    else return 'data';
  },
  btnOK() {
    const actionName = Template.Voting_edit.actionFromId();
    if (actionName === 'insert') return 'Launch voting';
    else if (actionName === 'update') return 'save';
    else if (actionName === 'view') return 'OK';
    else return '';
  },
  // Default values for insert autoForm: https://github.com/aldeed/meteor-autoform/issues/210
  defaultOpenDate() {
    return Clock.currentTime();
  },
  defaultCloseDate() {
    return moment().add(15, 'day').toDate();
  },
  agendaOptions() {
    const communityId = Session.get('activeCommunityId');
    const agendas = Agendas.find({ communityId });
    return agendas.map(function option(a) { return { label: a.title, value: a._id }; });
  },
  choices() {
    const instance = Template.instance();
    return instance.choices.get();
  },
  attachments() {
    const topicId = getTopicId(this);
    return Shareddocs.find({ topicId });
  },
  updateForm() {
    const afType = Session.get('autoformType');
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
    if (event.keyCode == 13 ){
      let currentChoices = Template.instance().choices.get();
      const newChoice = $('.editing input')[0].value;
      currentChoices = currentChoices.concat(newChoice);
      Template.instance().choices.set(currentChoices);
      $('.js-enter-choice').val("");
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
    const topicId = getTopicId(Template.instance().data);
    Shareddocs.upload({
      communityId: Session.get('activeCommunityId'),
      folderId: 'voting',
      topicId,
    });
  },
});

function voteStatusChangeSchema(statusName) {
  debugAssert(statusName);
  const schema = new SimpleSchema([Comments.schema,
    { status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } } },
  ]);
  schema.i18n('schemaTickets');
  return schema;
}

export function afVoteStatusChangeModal(topicId, newStatusName, message) {
  Session.set('activeTopicId', topicId);
  Session.set('newStatusName', newStatusName);
  let description = '';
  if (message) description = message;
  Modal.show('Autoform_edit', {
    id: 'af.vote.statusChange',
    description,
    schema: voteStatusChangeSchema(newStatusName),
    omitFields: ['topicId', 'userId', 'data', 'communityId'],
    type: 'method',
    meteormethod: 'topics.statusChange',
    btnOK: 'Change status',
  });
}

AutoForm.addModalHooks('af.vote.insert');
AutoForm.addHooks('af.vote.insert', {
  formToDoc(doc) {
    Tracker.nonreactive(() => {   // AutoForm will run the formToDoc each time any field on the form, like the vote.type is simply queried (maybe so that if its a calculated field, it gets calculated)
      doc.createdAt = Clock.currentTime();
      doc.communityId = Session.get('activeCommunityId');
      doc.category = 'vote';
      doc.status = Votings.workflow.start[0].name;
      doc.vote.choices = votingEditInstance.choices.get();
      doc.closesAt = new Date(doc.closesAt.getFullYear(), doc.closesAt.getMonth(), doc.closesAt.getDate(), 23, 59, 59);
    });
    return doc;
  },
  onSuccess(formType, result) {
    const uploadIds = Shareddocs.find({ topicId: Meteor.userId() }).fetch().map(d => d._id);
    uploadIds.forEach(id => Shareddocs.update(id, { $set: { topicId: result } }));
  },
});

AutoForm.addModalHooks('af.vote.update');
AutoForm.addHooks('af.vote.update', {
  docToForm(doc, ss) {
    votingEditInstance.choices.set(doc.vote.choices);
    return doc;
  },
  formToModifier(modifier) {
    delete modifier.$set.createdAt;
    delete modifier.$set.closesAt;
    modifier.$set['vote.choices'] = votingEditInstance.choices.get();
    return modifier;
  },
});

AutoForm.addModalHooks('af.vote.statusChange');
AutoForm.addHooks('af.vote.statusChange', {
  formToDoc(doc) {
    const newStatusName = Session.get('newStatusName');
    doc.topicId = Session.get('activeTopicId');
    doc.type = 'statusChangeTo'; // `statusChangeTo.${newStatusName}`;
    doc.status = newStatusName;
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('activeTopicId');  // clear it
    Session.set('newStatusName');  // clear it
  },
});
