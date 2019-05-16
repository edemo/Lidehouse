import { Template } from 'meteor/templating';
import { numeral } from 'meteor/numeral:numeral';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { __ } from '/imports/localization/i18n.js';

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
