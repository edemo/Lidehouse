import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Topics } from '/imports/api/topics/topics.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { ticketSchema } from '/imports/api/topics/tickets/tickets.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import '../modals/autoform-edit.js';
import '../modals/confirmation.js';

import './tickets-report.html';

Template.Tickets_report.onCreated(function () {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Tickets_report.helpers({
  activeTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $not: 'closed' } }).fetch();
    };
  },
  closedTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': 'closed' }).fetch();
    };
  },
  activeTicketsOptionsFn() {
    return () => {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
  closedTicketsOptionsFn() {
    return () => {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

const ticketReportSchema = new SimpleSchema({
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, optional: true },
  ticket: { type: ticketSchema, optional: true },
});

Template.Tickets_report.events({
  'click .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.ticket.insert',
      collection: Topics,
      schema: ticketReportSchema,
      type: 'method',
      meteormethod: 'topics.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.ticket.update',
      collection: Topics,
      schema: ticketReportSchema,
      doc: Topics.findOne(id),
      type: 'method-update',
      meteormethod: 'topics.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeTopic, { _id: id }, 'remove topic');
  },
});

AutoForm.addModalHooks('af.ticket.insert');
AutoForm.addModalHooks('af.ticket.update');
AutoForm.addHooks('af.ticket.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'ticket';
    return doc;
  },
});
