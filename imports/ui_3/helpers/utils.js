import { Template } from 'meteor/templating';
import { numeral } from 'meteor/numeral:numeral';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { __ } from '/imports/localization/i18n.js';
import { TicketStatuses } from '/imports/api/topics/tickets/ticket-status.js';

Template.registerHelper('and', function and(a, b) {
    return a && b;
});

Template.registerHelper('or', function or(a, b) {
    return a || b;
});

Template.registerHelper('not', function not(a) {
    return !a;
});

Template.registerHelper('equals', function equals(a, b) {
    return a == b;
});

Template.registerHelper('add', function add(a, b) {
    return a + b;
});

Template.registerHelper('includes', function includes(a, b) {
    return a.includes(b);
});

Template.registerHelper('round', function round(number, digits) {
    return number.toFixed(digits);
});

Template.registerHelper('displayPercent', function displayPercent(number) {
    return numeral(number).format('0.00') + '%';
});

Template.registerHelper('displayRoundPercent', function percentage(number) {
    return numeral(number).format('0') + '%';
});

Template.registerHelper('displayMoney', function displayMoney(number) {
    return numeral(number).format('0,0$');
});

Template.registerHelper('currentTime', function currentTime() {
    return moment().format('L LT');
});

Template.registerHelper('currentDate', function currentDate() {
    return moment().format('L');
});

Template.registerHelper('displayTime', function displayTime(time) {
    return moment(time).format('L LT');
});

Template.registerHelper('displayDate', function displayDate(time) {
    return moment(time).format('L');
});

Template.registerHelper('displayTimeFrom', function displayTimeFrom(time) {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(time).from(serverTimeNow);
});

// TODO: This aims to be a generic display, but now works only for ticket data - needs generalization!
Template.registerHelper('displayValue', function displayValue(val) {
    if (_.isDate(val)) return moment().format('L');
    if (_.isString(val)) return __(val);
    return val;
});

// Takes any number of arguments and returns them concatenated.
Template.registerHelper('concat', function concat() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
});

Template.registerHelper('join', function join(items) {
    return items.join(', ');
});

Template.registerHelper('translateArray', function translateArray(items) {
    return items.map(i => __(i));
});

Template.registerHelper('log', function log(stuff) {
    console.log(stuff);
});

Template.registerHelper('entriesOf', function entriesOf(obj) {
  return Object.entries(obj);
});

Template.registerHelper('statusColor', function statusColor(statusName) {
  return TicketStatuses[statusName].color;
});

Template.registerHelper('keys', function keys(object) {
  return Object.keys(object);
});
Template.registerHelper('select', function select(key, object) {
  return object[key];
});
