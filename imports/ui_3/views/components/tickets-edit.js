import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { Topics } from '/imports/api/topics/topics.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { ticketsSchema, TicketStatusChangeSchema } from '/imports/api/topics/tickets/tickets.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';

export function afTicketInsertModal() {
  Modal.show('Autoform_edit', {
    id: 'af.ticket.insert',
    collection: Topics,
    schema: ticketsSchema,
    omitFields: ['agendaId', 'sticky', 'ticket.status', 'ticket.category'],
    type: 'method',
    meteormethod: 'topics.insert',
    template: 'bootstrap3-inline',
    btnOK: 'Create ticket',
  });
}

export function afTicketUpdateModal(id) {
  Modal.show('Autoform_edit', {
    id: 'af.ticket.update',
    collection: Topics,
    schema: ticketsSchema,
    omitFields: ['agendaId', 'sticky', 'ticket.status'],
    doc: Topics.findOne(id),
    type: 'method-update',
    meteormethod: 'topics.update',
    singleMethodArgument: true,
    template: 'bootstrap3-inline',
  });
}

export function afTicketStatusChangeModal(id) {
  Session.set('modalTopicId', id);
  Modal.show('Autoform_edit', {
    id: 'af.ticket.statusChange',
    schema: TicketStatusChangeSchema,
    omitFields: ['topicId'],
    type: 'method',
    meteormethod: 'ticket.statusChange',
    template: 'bootstrap3-inline',
    btnOK: 'Change status',
  });
}

export function deleteTicketConfirmAndCallModal(id) {
  Modal.confirmAndCall(removeTopic, { _id: id }, {
    action: 'delete ticket',
    message: 'It will disappear forever',
  });
}

AutoForm.addModalHooks('af.ticket.insert');
AutoForm.addModalHooks('af.ticket.update');
AutoForm.addModalHooks('af.ticket.statusChange');
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
AutoForm.addHooks('af.ticket.statusChange', {
  formToDoc(doc) {
    doc.topicId = Session.get('modalTopicId');
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('modalTopicId');  // clear it
  },
});