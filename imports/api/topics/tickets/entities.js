import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/entities.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const ticketSchemaWithMoreDates = new SimpleSchema([
  Tickets.schema, {
    moreDates: { type: [Date], optional: true },
  },
]);
Meteor.startup(function attach() {
  ticketSchemaWithMoreDates.i18n('schemaTickets');
});

export function ticketPrototype(type) {
  return Topics._transform({ category: 'ticket', text: '-', ticket: { type } });
}

Topics.entities.ticket = {
  form: 'Autoform_edit',
  schema: Tickets.schema,
  implicitFields: {
    communityId: () => Session.get('activeCommunityId'),
    category: 'ticket',
  },
};

Topics.entities.issue = {
  form: Topics.entities.ticket.form,
  schema: Tickets.schema,
  implicitFields: _.extend({ 'ticket.type': 'issue' }, Topics.entities.ticket.implicitFields),
};

Topics.entities.maintenance = {
  form: Topics.entities.ticket.form,
  schema: ticketSchemaWithMoreDates,
  implicitFields: _.extend({ 'ticket.type': 'maintenance' }, Topics.entities.ticket.implicitFields),
};

Topics.entities.upgrade = {
  form: Topics.entities.ticket.form,
  schema: Tickets.schema,
  implicitFields: _.extend({ 'ticket.type': 'upgrade' }, Topics.entities.ticket.implicitFields),
};
