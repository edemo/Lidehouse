import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '../../api/parcels/parcels';

export function label(value, color, icon) {
  if (value === undefined) return undefined;
  const iconBadge = icon ? `<i class="fa fa-${icon}"></i> ` : '';
  return `<span class="label label-${color} label-xs">${iconBadge}${value}</span>`;
}

export function checkBoolean(bool) {
  return bool ? '<i class="fa fa-check text-navy"></i>' : '';
}

export function checkmarkBoolean(bool) {
  const icon = bool ? 'fa-check' : 'fa-times';
  const color = bool ? 'navy' : 'danger';
  const title = bool ? 'Reconciled' : 'Unreconciled';
  return `<i class="fa ${icon} text-${color}" title="${__(title)}"></i>`;
}

export function displayMeterService(name) {
  if (!name) return '';
  return label(__('schemaMeters.service.' + name), 'default');
}

export function displayReading(value) {
  return label(value, 'info');
}

export function displayOutstanding(value) {
  return value == 0 ? value : label(value, 'info');
}

export function displayAccountText(code) {
  if (!code) return '';
  const collection = code.charAt(0) === '`' ? Accounts : Parcels;
  const account = collection.getByCode(code);
  return account && account.displayAccount();
}

export function displayAccount(code) {
  if (!code) return '';
  const text = displayAccountText(code);
  if (!text) return '';
  let icon;
  switch (text.charAt(0)) {
    case '`': icon = 'tag'; break;
    case '@': icon = 'map-marker'; break;
    case '#': icon = 'flag'; break;
    default: debugAssert(false);
  }
  return label(text.substring(1), 'success', icon);
}

export function displayAccountSet(codes) {
  if (!codes) return '';
  return codes.map(code => displayAccount(code)).join(' ');
}

export function displayLocalizer(localizer) {
  return displayAccount(localizer);
}

export function displayAccountSpecification(aspec) {
  let html = '';
  html += displayAccount(aspec.account, aspec.communityId);
  if (aspec.localizer) {
    html += displayLocalizer(aspec.localizer, aspec.communityId);
  }
  return html;
}

export function displayTicketType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.type.' + name), 'default');
}

export function displayStatus(name) {
  if (!name) return '';
  let color;
  ['ticket', 'vote'].forEach((cat) => {
    const statusObject = Topics.categories[cat].statuses[name];
    if (statusObject) color = statusObject.color;
  });
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

Template.registerHelper('checkBoolean', checkBoolean);
Template.registerHelper('checkmarkBoolean', checkmarkBoolean);
Template.registerHelper('displayMeterService', displayMeterService);
Template.registerHelper('displayReading', displayReading);
Template.registerHelper('displayAccountText', displayAccountText);
Template.registerHelper('displayAccount', displayAccount);
Template.registerHelper('displayAccountSet', displayAccountSet);
Template.registerHelper('displayLocalizer', displayLocalizer);
Template.registerHelper('displayAccountSpecification', displayAccountSpecification);
Template.registerHelper('displayStatus', displayStatus);
Template.registerHelper('displayTicketType', displayTicketType);
Template.registerHelper('displayUrgency', displayUrgency);
Template.registerHelper('displayChargeType', displayChargeType);

const Renderers = {
  'Topics.status': displayStatus,
  'Tickets.ticket.type': displayTicketType,
  'Tickets.ticket.urgency': displayUrgency,
  'Tickets.ticket.localizer': displayLocalizer,
  'Tickets.ticket.chargeType': displayChargeType,
  'Tickets.ticket.partnerId': id => (Partners.findOne(id) ? Partners.findOne(id).getName() : undefined),
  'Tickets.ticket.contractId': id => (Contracts.findOne(id) ? Contracts.findOne(id).title : undefined),
  //'ticket.txId'
  'Votings.agendaId': id => (Agendas.findOne(id) ? Agendas.findOne(id).title : undefined),
};

// This aims to be a generic display -- works for Tickets only for now
Template.registerHelper('displayKey', function displayKey(key) {
  return __(`schema${key}.label`);
});

Template.registerHelper('displayValue', function displayValue(key, value) {
  if (key.includes('Cost')) {
    const community = getActiveCommunity();
    numeral.language(community.settings.language);
    return numeral(value).format('0,0$');
  }
  if (Renderers[key]) return Renderers[key](value);
  if (_.isDate(value)) return moment(value).format('L');
  if (_.isString(value)) return __(value);
  return value;
});
