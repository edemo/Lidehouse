/* globals Waypoint */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { numeral } from 'meteor/numeral:numeral';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';

export function negativeClass(number) {
  return number < 0 && 'negative';
}

export function displayCurrency(number) {
  const lang = getActiveCommunity().settings.language;
//  const decimals = Locales[lang].currencyDecimals;
//  const decis = '0'.repeat(decimals);
//  const formatString = showZeros ? `0,0.${decis}` : `0,0.[${decis}]`;
  const formatString = __('currencyFormat', {}, lang);
  return numeral(number).format(formatString);
}

export function displayNumber(number, decimals = 2, showZeros = true) {
  const decis = '0'.repeat(decimals);
  const formatString = showZeros ? `0,0.${decis}` : `0,0.[${decis}]`;
  return numeral(number).format(formatString);
}

export function displayDate(time) {
  if (!time) return '---';
  return moment.utc(time).format('L');
}

export function defaultBeginDate() {
//    return moment().startOf('year').format('YYYY-MM-DD');
  return moment().subtract(1, 'year').format('YYYY-MM-DD');
}

export function defaultEndDate() {
  return moment().format('YYYY-MM-DD');
}

if (Meteor.isClient) {
  Template.registerHelper('Meteor', function meteor() {
    return Meteor;
  });

  Template.registerHelper('Waypoint', function waypoint(method) {
    return Waypoint[method]();
  });

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

  Template.registerHelper('subtract', function add(a, b) {
    return a - b;
  });

  Template.registerHelper('includes', function includes(a, b) {
    return a.includes(b);
  });

  Template.registerHelper('isNotEmptyObject', function isNotEmptyObject(object) {
    return !_.isEmpty(object);
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

  Template.registerHelper('displayCurrency', displayCurrency);

  Template.registerHelper('negativeClass', negativeClass);

  Template.registerHelper('displayNumber', displayNumber);

  Template.registerHelper('currentTime', function currentTime() {
    return moment().format('L LT');
  });

  Template.registerHelper('currentDate', function currentDate() {
    return moment().format('L');
  });

  Template.registerHelper('displayTime', function displayTime(time) {
    if (!time) return '---';
    return moment(time).format('L LT');
  });

  Template.registerHelper('displayDate', displayDate);

  Template.registerHelper('defaultBeginDate', defaultBeginDate);

  Template.registerHelper('defaultEndDate', defaultEndDate);

  Template.registerHelper('displayTimeFrom', function displayTimeFrom(time) {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return time ? moment(time).from(serverTimeNow) : __('never');
  });

  Template.registerHelper('absoluteUrl', function absoluteUrl(path) {
    if (path?.charAt(0) === '/') return Meteor.absoluteUrl(path);
    return path;
  });

  // Takes any number of arguments and returns them concatenated.
  Template.registerHelper('concat', function concat() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
  });

  Template.registerHelper('join', function join(items) {
    return items.join(', ');
  });

  Template.registerHelper('translateArray', function translateArray(items) {
    return (items || []).map(i => __(i));
  });

  Template.registerHelper('firstChar', function firstChar(text) {
    return text.charAt(0);
  });

  Template.registerHelper('log', function log(stuff) {
    // eslint-disable-next-line no-console
    console.log(stuff);
  });

  Template.registerHelper('obj', function obj(json) {
    if (!json) return undefined;
    return JSON.parse(json);
  });

  Template.registerHelper('entriesOf', function entriesOf(obj) {
    if (!obj) return undefined;
    return Object.entries(obj);
  });

  Template.registerHelper('keys', function keys(object) {
    return Object.keys(object);
  });

  Template.registerHelper('select', function select(key, object) {
    return object[key];
  });
}