import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { allSubscriptionsReady } from '/imports/utils/all-subscriptions-ready.js';
import { isImage } from 'meteor/droka:autoform-ufs/lib/client/af-file-upload.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Buckets } from '/imports/api/marketplace/buckets/buckets.js';
import { displayNumber, displayCurrency } from './utils.js';

export function label(value, color, icon) {
  if (value === undefined) return undefined;
  const iconBadge = icon ? `<i class="fa fa-${icon}"></i> ` : '';
  return `<span class="label label-${color} label-xs">${iconBadge}${value}</span>`;
}

export function checkBoolean(bool) {
  return bool ? '<i class="fa fa-check text-navy"></i>' : '';
}

export function checkmarkBoolean(bool) {
  if (_.isUndefined(bool)) return '';
  const icon = bool ? 'fa-check' : 'fa-times';
  const color = bool ? 'navy' : 'danger';
  const title = bool ? 'Reconciled' : 'Unreconciled';
  return `<i class="fa ${icon} text-${color}" title="${__(title)}"></i>`;
}

export function displayMeterService(name) {
  if (!name) return '';
  return label(name, 'default');
}

export function displayReading(value, decimals) {
  return label(displayNumber(value, decimals), 'info');
}

export function displayOutstanding(value) {
  return value == 0 ? value : label(value, 'info');
}

export function displayPartner(code) {
  if (!code) return '';
  const split = code.split('/');
  const partner = split[0] ? Partners.findOne(split[0]) : undefined;
  const text = partner?.toString();
  return label(text, 'primary', 'user');
}

export function displayPartnerContract(code) {
  if (!code) return '';
  const split = code.split('/');
  const partner = split[0] ? Partners.findOne(split[0]) : undefined;
  const contract = split[1] ? Contracts.findOne(split[1]) : undefined;
  let text = '';
  if (partner) text += partner.toString();
  if (contract) text += '/' + contract.toString();
  return label(text, 'primary', 'user');
}

export function displayStringArray(array, translatePath = '') {
  let text = '';
  if (typeof array == "object") array.forEach((elem, index) => {
    text += __(translatePath + elem) + (index < array.length - 1 ? ', ' : '');
  });
  return text;
}
  
export function displayAccountText(code, longForm = true) {
  if (!code) return '';
//  const collection = [Accounts, Parcels, Buckets].find(coll => coll.rootCode === code.charAt(0));
  let collection;
  switch(code.charAt(0)) {
    case '>': collection = Buckets; break;
    case '`': collection = Accounts; break;
    default: collection = Parcels; break;
  }
  let account;
  if (collection === Accounts) {
    const isTechnical = Accounts.isTechnicalCode(code);
    const nonTechnicalCode = isTechnical ? Accounts.fromTechnicalCode(code) : code;
    account = collection.getByCode(nonTechnicalCode);
    if (isTechnical) account = Accounts.toTechnical(account);  
  } else account = collection.getByCode(code);
  const text = longForm ? account?.displayFull() : __(account?.name);
  return text || code;
}

export function displayAccount(code) {
  if (!code) return '';
  const text = displayAccountText(code);
  if (!text) return '';
  let icon;
  switch (text.charAt(0)) {
    case '>': icon = 'gift'; break;
    case '`': icon = 'tag'; break;
    case '%': 
    case '&': // physical place - common area
    case '@': icon = 'map-marker'; break; // physical place - parcel/property
    case '#': icon = 'flag'; break; // virtual localizer
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
  return label(__('schemaTickets.ticket.type.options.' + name), 'default');
}

export function displayStatus(name) {
  if (!name) return '';
  let color;
  ['ticket', 'vote'].forEach((cat) => {
    const statusObject = Topics.categories[cat].statuses[name];
    if (statusObject) color = statusObject.color;
  });
  return label(__('schemaTopics.status.options.' + name), color);
}

export function displayTxStatus(name, doc) {
  if (!name) return '';
  const statusObject = Transactions.statuses[name];
  const displayName = _.last(doc.serialId.split('/')) === 'STORNO' ? 'storno' : name;
  return label(__('schemaTransactions.status.options.' + displayName), statusObject?.color);
}

export function displayUrgency(name) {
  if (!name) return '';
  const color = Tickets.urgencyColors[name];
  return label(__('schemaTickets.ticket.urgency.options.' + name), color);
}

export function displayChargeType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.chargeType.options.' + name), 'default');
}

export function displayTxIdentifiers(name) {
  if (!name) return '';
  var result = '';
  name.split(',').forEach((identifier, index) => {
    const tx = Transactions.findOne({ communityId: getActiveCommunityId(), serialId: identifier.trim() });
    if (!tx) return;
    if (index > 0) result += '</br>+ ';
    result += `<a href=${FlowRouter.path('Transaction show', { _txid: tx._id })}>${displayCurrency(tx?.amount)} <span class="text-navy">(${identifier})</span></a>`;
  });
  return result;
}

export function displayReview(review) {  
}

const Renderers = {
  'Topics.status': displayStatus,
  'Topics.notiLocalizer': displayLocalizer,
  'Tickets.ticket.type': displayTicketType,
  'Tickets.ticket.urgency': displayUrgency,
  'Tickets.ticket.localizer': displayLocalizer,
  'Tickets.ticket.chargeType': displayChargeType,
  'Tickets.ticket.partnerId': id => Partners.findOne(id)?.getName(),
  'Tickets.ticket.contractId': id => Contracts.findOne(id)?.title,
  'Tickets.ticket.txIdentifiers': displayTxIdentifiers,
  //'ticket.txId'
  'Votings.agendaId': id => (Agendas.findOne(id) ? Agendas.findOne(id).title : undefined),
};

export function displayKey(key) {
  return __(`schema${key}.label`);
}
// This aims to be a generic display -- works for Tickets only for now
export function displayValue(key, value) {
  if (_.isArray(value)) return value.map(elem => displayValue(key, elem)).join(' ');
  if (key.includes('Cost')) return numeral(value).format('0,0$');
  if (Renderers[key]) return Renderers[key](value);
  if (_.isDate(value)) return moment(value).format('L');
  if (_.isString(value)) return __(value);
  return value;
}

if (Meteor.isClient) {
  Template.registerHelper('allSubscriptionsReady', allSubscriptionsReady);
  Template.registerHelper('isImage', isImage);
  Template.registerHelper('checkBoolean', checkBoolean);
  Template.registerHelper('checkmarkBoolean', checkmarkBoolean);
  Template.registerHelper('displayMeterService', displayMeterService);
  Template.registerHelper('displayReading', displayReading);
  Template.registerHelper('displayPartner', displayPartner);
  Template.registerHelper('displayPartnerContract', displayPartnerContract);
  Template.registerHelper('displayStringArray', displayStringArray);
  Template.registerHelper('displayAccountText', displayAccountText);
  Template.registerHelper('displayAccount', displayAccount);
  Template.registerHelper('displayAccountSet', displayAccountSet);
  Template.registerHelper('displayLocalizer', displayLocalizer);
  Template.registerHelper('displayAccountSpecification', displayAccountSpecification);
  Template.registerHelper('displayStatus', displayStatus);
  Template.registerHelper('displayTxStatus', displayTxStatus);
  Template.registerHelper('displayTicketType', displayTicketType);
  Template.registerHelper('displayUrgency', displayUrgency);
  Template.registerHelper('displayChargeType', displayChargeType);
  Template.registerHelper('displayKey', displayKey);
  Template.registerHelper('displayValue', displayValue);
}
