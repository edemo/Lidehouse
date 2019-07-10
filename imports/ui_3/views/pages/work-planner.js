import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';
import { Topics } from '/imports/api/topics/topics.js';
import { Localizer, chooseLocalizerNode } from '/imports/api/transactions/breakdowns/localizer.js';

import './work-planner.html';

Template.Work_planner.viewmodel({
  expectedStart: moment().format('YYYY-MM-DD'),
  expectedStarts: [],
  communityId: Session.get('activeCommunityId'),
  index: 0,
  dates() {
    return this.expectedStarts();
  },
  lengthOfArray() {
    if (this.expectedStarts().length > 0) return true;
    return false;
  },
  localizers() {
    return Localizer.get(this.communityId()).nodeOptions();
  },
});

Template.Work_planner.events({
  'click .js-add-date'(event, instance) {
    const expectedStarts = instance.viewmodel.expectedStarts();
    const index = instance.viewmodel.index();
    const expectedStart = $('#expectedStart').val();
    expectedStarts.push({ expectedStart, index });
    instance.viewmodel.expectedStarts(expectedStarts);
    instance.viewmodel.index(index + 1);
  },
  'click .js-delete-date'(event, instance) {
    const expectedStarts = instance.viewmodel.expectedStarts();
    const index = Number($(event.target).attr('data-value'));
    let newArray = [];
    expectedStarts.forEach((date) => {
      if (index === date.index) newArray = _.without(expectedStarts, date);
    });
    instance.viewmodel.expectedStarts(newArray);
  },
  'click .js-insert-date'(event, instance) {
    const expectedStarts = instance.viewmodel.expectedStarts();
    const communityId = Session.get('activeCommunityId');
    const userId = Meteor.userId();
    const title = $('#title').val();
    const text = $('#text').val();
    const status = 'scheduled';
    const urgency = 'normal';
    const localizer = $('#localizer').val();
    const type = 'maintenance';
    const category = 'ticket';
    const doc = { communityId, userId, title, text, status, category, ticket: { urgency, localizer, type } };
    expectedStarts.forEach((date) => {
      doc.ticket.expectedStart = date.expectedStart;
      Topics.methods.insert.call(doc);
    });
    instance.viewmodel.expectedStarts([]);
  },
});
