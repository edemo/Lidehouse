import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';

import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { statusChangeEventSchema } from '/imports/api/topics/events.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { checkTopicPermissions } from '../../../api/method-checks';
import { TicketTypes } from '../../../api/topics/tickets/ticket-status';

export function afTicketInsertModal() {
/*  const communityId = Session.get('activeCommunityId');
  const omitFields = ['agendaId', 'sticky', 'ticket.status'];
  if (!Meteor.user().hasPermission('ticket.update', communityId)) {
    omitFields.push('ticket.type');
    omitFields.push('ticket.category');
  } */
  Modal.show('Autoform_edit', {
    id: 'af.ticket.insert',
    collection: Topics,
    schema: Tickets.schema,
    fields: ['title', 'text', 'ticket.urgency'],
    type: 'method',
    meteormethod: 'topics.insert',
    btnOK: 'Create ticket',
  });
}

export function afTaskInsertModal() {
  Modal.show('Autoform_edit', {
    id: 'af.task.insert',
    collection: Topics,
    schema: Tickets.schema,
    fields: ['title', 'text'],
    type: 'method',
    meteormethod: 'topics.insert',
    template: 'bootstrap3-inline',
    btnOK: 'Create ticket',
  });
}

export function afTicketUpdateModal(topicId) {
  Modal.show('Autoform_edit', {
    id: 'af.ticket.update',
    collection: Topics,
    schema: Tickets.schema,
    omitFields: ['agendaId', 'sticky'],
    doc: Topics.findOne(topicId),
    type: 'method-update',
    meteormethod: 'topics.update',
    singleMethodArgument: true,
  });
}

export function afTicketStatusChangeModal(topicId, newStatusName) {
  Session.set('activeTopicId', topicId);
  Session.set('newStatusName', newStatusName);
  Modal.show('Autoform_edit', {
    id: 'af.ticket.statusChange',
    schema: statusChangeEventSchema(newStatusName, topicId),
    omitFields: ['topicId', 'userId', 'data', 'communityId'],
    type: 'method',
    meteormethod: 'statusChange',
    btnOK: 'Change status',
  });
}

export function deleteTicketConfirmAndCallModal(topicId) {
  Modal.confirmAndCall(Topics.methods.remove, { _id: topicId }, {
    action: 'delete ticket',
    message: 'It will disappear forever',
  });
}

AutoForm.addModalHooks('af.ticket.insert');
AutoForm.addModalHooks('af.task.insert');
AutoForm.addModalHooks('af.ticket.update');
AutoForm.addModalHooks('af.ticket.statusChange');
AutoForm.addHooks('af.ticket.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'ticket';
    if (!doc.ticket) doc.ticket = {};
    doc.ticket.type = doc.ticket.type || 'issue';
    doc.status = TicketTypes.issue.start;
    return doc;
  },
});

AutoForm.addHooks('af.task.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'ticket';
    if (!doc.ticket) doc.ticket = {};
    doc.ticket.type = doc.ticket.type || 'maintenance';
    doc.status = TicketTypes.maintenance.start;
    return doc;
  },
});

AutoForm.addHooks('af.ticket.statusChange', {
  formToDoc(doc) {
    const newStatusName = Session.get('newStatusName');
    doc.topicId = Session.get('activeTopicId');
    doc.userId = Meteor.userId();
    doc.type = 'statusChangeTo'; // `statusChangeTo.${newStatusName}`;
    doc.status = newStatusName;
    doc.ticket = doc.ticket || {};
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('activeTopicId');  // clear it
  },
});
