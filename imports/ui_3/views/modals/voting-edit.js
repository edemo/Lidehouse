import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { votingsExtensionSchema } from '/imports/api/topics/votings/votings.js';
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
  const instance = Template.instance();
  instance.choices = new ReactiveVar([]);
  votingEditInstance = instance;
  this.autorun(() => {
    const currentVoteType = AutoForm.getFieldValue('vote.type', `af.vote.${Template.Voting_edit.actionFromId()}`);
    const newChoices = Topics.voteTypeChoices[currentVoteType] || [];
    if (newChoices.length) {
        instance.choices.set(newChoices);
    }
  });
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const topicId = getTopicId(Template.instance().data);
    this.subscribe('shareddocs.ofTopic', { communityId, topicId });
  });
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
  needsChoicesSpecified() {
    const currentVoteType = AutoForm.getFieldValue('vote.type');
    return !!(Topics.voteTypeChoices[currentVoteType]);
  },
  choices() {
    const instance = Template.instance();
    return instance.choices.get();
  },
  attachments() {
    const topicId = getTopicId(this);
    return Shareddocs.find({ topicId });
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

AutoForm.addModalHooks('af.vote.insert');
AutoForm.addHooks('af.vote.insert', {
  formToDoc(doc) {
    Tracker.nonreactive(() => {   // AutoForm will run the formToDoc each time any field on the form, like the vote.type is simply queried (maybe so that if its a calculated field, it gets calculated)
      doc.createdAt = Clock.currentTime();
      doc.communityId = Session.get('activeCommunityId');
      doc.userId = Meteor.userId();
      doc.category = 'vote';
      doc.vote.choices = votingEditInstance.choices.get();
      doc.vote.closesAt = moment(doc.vote.closesAt).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').toDate();
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
    delete modifier.$set['vote.closesAt'];
    modifier.$set['vote.choices'] = votingEditInstance.choices.get();
    return modifier;
  },
});
