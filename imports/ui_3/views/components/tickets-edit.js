import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { createHmac } from 'crypto';

export function afTicketInsertModal(type, contractId) {
  const workflow = Tickets.workflows[type];
  const startStatus = workflow.start[0];
  const schemaWithMoreDates = new SimpleSchema([Tickets.schema, {
    moreDates: { type: [Date], optional: true },
  }]);
  schemaWithMoreDates.i18n('schemaTickets');

  let fields = ['title', 'text'].concat(startStatus.data.map(d => 'ticket.' + d));
  if (type === 'maintenance') {
    fields.push('moreDates');
  }
  if (contractId) {
    fields = _.without(fields, 'ticket.contractId', 'ticket.partner');
  }

  Session.set('activeTicketType', type);
  Session.set('activeContractId', contractId);
  Modal.show('Autoform_edit', {
    id: 'af.ticket.insert',
    schema: schemaWithMoreDates,
    fields,
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

export function fixedStatusValue(value) {
  return {
    options() { return [{ label: __('schemaTopics.status.' + value), value }]; },
    firstOption: false,
    disabled: true,
  };
}

function ticketStatusChangeSchema(statusName, topicId) {
  debugAssert(statusName);
  const topic = Topics.findOne(topicId);
  const statusObject = Tickets.statuses[statusName];
  const dataSchema = statusObject.data ? new SimpleSchema(
    statusObject.data.map(function (dataField) { return { [dataField]: Tickets.extensionRawSchema[dataField] }; })
  ) : undefined;
  const schema = new SimpleSchema([Comments.schema,
    { status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } } },
    statusObject.data ? { ticket: { type: dataSchema, optional: true } } : {},
  ]);
  schema.i18n('schemaTickets');
  return schema;
}

export function afTicketStatusChangeModal(topicId, newStatusName) {
  Session.set('activeTopicId', topicId);
  Session.set('newStatusName', newStatusName);
  Modal.show('Autoform_edit', {
    id: 'af.ticket.statusChange',
    schema: ticketStatusChangeSchema(newStatusName, topicId),
    omitFields: ['topicId', 'userId', 'data', 'communityId'],
    type: 'method',
    meteormethod: 'topics.statusChange',
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
AutoForm.addModalHooks('af.ticket.update');
AutoForm.addModalHooks('af.ticket.statusChange');

AutoForm.addHooks('af.ticket.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'ticket';
    if (!doc.ticket) doc.ticket = {};
    doc.ticket.type = Session.get('activeTicketType');
    doc.status = Tickets.workflows[doc.ticket.type].start[0].name;
    doc.ticket.contractId = Session.get('activeContractId');
    doc.moreDates = doc.moreDates || [];
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.ticket.insert');
    const afContext = this;
    const results = [];
    function insert(ticket) {
      Topics.methods.insert.call(ticket, function handler(err, res) {
        if (err) {
          displayError(err);
          afContext.done(err);
          return;
        }
        results.push(res);
        if (results.length === doc.moreDates.length + 1) afContext.done(null, results);
      });
    }
    insert(doc);
    doc.moreDates.forEach((date) => {
      doc.ticket.expectedStart = date;
      insert(doc);
    });
    return false;
  },
  onSuccess(formType, result) {
    Session.set('activeTicketType');  // clear it
    Session.set('activeContractId');  // clear it
  },
});

AutoForm.addHooks('af.ticket.statusChange', {
  formToDoc(doc) {
    const newStatusName = Session.get('newStatusName');
    doc.topicId = Session.get('activeTopicId');
    doc.userId = Meteor.userId();
    doc.type = 'statusChangeTo'; // `statusChangeTo.${newStatusName}`;
    doc.status = newStatusName;
    doc.data = doc.ticket || {};
    delete doc.ticket;
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('activeTopicId');  // clear it
  },
});
