import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

// === Ticket statuses

const reported = {
  name: 'reported',
  color: 'warning',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 } },
  }),
//  actions: [],
//  permissions: [],
  next: ['confirmed', 'deleted'],
};

const confirmed = {
  name: 'confirmed',
  color: 'info',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 }, optional: true },
  }),
  next: ['progressing', 'deleted'],
};

const scheduled = {
  name: 'scheduled',
  color: 'warning',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 } },
  }),
  next: ['confirmed', 'deleted'],
};

const progressing = {
  name: 'progressing',
  color: 'info',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 }, optional: true },
    expected: { type: Date },
  }),
  next: ['finished', 'confirmed', 'deleted'],
};

const finished = {
  name: 'finished',
  color: 'primary',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 }, optional: true },
    expected: { type: Date },
  }),
  next: ['closed', 'progressing', 'deleted'],
};

const closed = {
  name: 'finished',
  color: 'default',
  schema: new SimpleSchema({
    text: { type: String, max: 5000, autoform: { rows: 8 }, optional: true },
    expected: { type: Date },
  }),
  next: [],
};

export const TicketStatuses = {
  reported, confirmed, scheduled, progressing, finished, closed,
};

//=== Status graph:

// megcsinaltuk a next-ben

//== Ticket types:

export const TicketStatusNames = Object.keys(TicketStatuses);
export const TicketStartStatuses = [reported, scheduled];
export const TicketTypeNames = TicketStartStatuses.map(s => s.name);
