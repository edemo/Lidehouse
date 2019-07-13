import { Template } from 'meteor/templating';
import { __ } from '/imports/localization/i18n.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

function boxed(value, color) {
  if (!value) return undefined;
  return `<span class="label label-${color} label-xs">${value}</span>`;
}

export function displayAccount(account, communityId) {
  if (!account) return '';
  return boxed(ChartOfAccounts.get({ communityId }).display(account), 'success');
}

export function displayLocalizer(localizer, communityId) {
  if (!localizer) return '';
  return boxed(Localizer.get(communityId).display(localizer), 'success');
}

export function displayTicketType(name) {
  if (!name) return '';
  return boxed(__('schemaTickets.ticket.type.' + name), 'default');
}

export function displayTicketStatus(name) {
  if (!name) return '';
  const color = Tickets.statuses[name].color;
  return boxed(__('schemaTopics.status.' + name), color);
}

Template.registerHelper('displayAccount', displayAccount);

Template.registerHelper('displayLocalizer', displayLocalizer);

Template.registerHelper('displayTicketType', displayTicketType);

Template.registerHelper('displayTicketStatus', displayTicketStatus);
