import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { ticketsSchema } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import './tickets-report.html';

Template.Tickets_report.onCreated(function () {
});

Template.Tickets_report.helpers({
  statusColor(value) {
    return Topics.statusColors[value];
  },
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
  ticketsSchema() {
    return ticketsSchema;
  },
  tickets() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket' }, { sort: { createdAt: -1 } });
  },
  recentTickets() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $ne: 'closed' } }, { sort: { createdAt: -1 } });
  },
  activeTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $ne: 'closed' } }).fetch();
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

Template.Tickets_report.events({
  'click .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.ticket.insert',
      collection: Topics,
      schema: ticketsSchema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId', 'sticky', 'ticket.status'],
      type: 'method',
      meteormethod: 'topics.insert',
      template: 'bootstrap3-inline',
      btnOK: 'Create ticket',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.ticket.update',
      collection: Topics,
      schema: ticketsSchema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId', 'sticky'],
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
    if (!doc.ticket) doc.ticket = {};
    doc.ticket.status = 'reported';
    return doc;
  },
});
