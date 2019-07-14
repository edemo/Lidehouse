import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

function label(value, color) {
  if (!value) return undefined;
  return `<span class="label label-${color} label-xs">${value}</span>`;
}

export function displayAccount(account, communityId) {
  if (!account) return '';
  return label(ChartOfAccounts.get({ communityId }).display(account), 'success');
}

export function displayLocalizer(localizer, communityId) {
  if (!localizer) return '';
  return label(Localizer.get(communityId).display(localizer), 'success');
}

export function displayTicketType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.type.' + name), 'default');
}

export function displayTicketStatus(name) {
  if (!name) return '';
  const color = Tickets.statuses[name].color;
  return label(__('schemaTopics.status.' + name), color);
}

export function displayUrgency(name) {
  if (!name) return '';
  const color = Tickets.urgencyColors[name];
  return label(__('schemaTickets.ticket.urgency.' + name), color);
}

export function displayChargeType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.chargeType.' + name), 'default');
}

Template.registerHelper('displayAccount', displayAccount);
Template.registerHelper('displayLocalizer', displayLocalizer);
Template.registerHelper('displayTicketType', displayTicketType);
Template.registerHelper('displayTicketStatus', displayTicketStatus);
Template.registerHelper('displayUrgency', displayUrgency);
Template.registerHelper('displayChargeType', displayChargeType);

const Renderers = {
  'Topics.agendaId': id => Agendas.findOne(id).title,
  'Topics.status': displayTicketStatus,
  'Tickets.ticket.type': displayTicketType,
  'Tickets.ticket.urgency': displayUrgency,
  'Tickets.ticket.localizer': displayLocalizer,
  'Tickets.ticket.chargeType': displayChargeType,
  'Tickets.ticket.contractId': id => Contracts.findOne(id).title,
  //'ticket.txId'
};

// This aims to be a generic display -- works for Tickets only for now
Template.registerHelper('displayKey', function displayKey(key) {
  return __(`schema${key}.label`);
});

Template.registerHelper('displayValue', function displayValue(key, value) {
  if (Renderers[key]) return Renderers[key](value);
  if (_.isDate(value)) return moment(value).format('L');
  if (_.isString(value)) return __(value);
  return value;
});
