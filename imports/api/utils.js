import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { checkExists } from '/imports/api/method-checks.js';

export function toggleElementInArray(collection, id, arrayName, element) {
  const object = checkExists(collection, id);
  const index = _.indexOf(object[arrayName], element);
  const action = (index >= 0) ? '$pull' : '$push';
  const modifier = { [action]: { [arrayName]: element } };
  collection.update(id, modifier, { selector: object });
}

export function toggle(element, array) {
  if (!Array.isArray(array)) array = [];
  if (array.includes(element)) return _.without(array, element);
  return array.concat([element]);
}

export function momentWithoutTZ(time) {
  const hours = time.hours();
  const mins = time.minutes();
  const dateObj = time.toDate();
  dateObj.setHours(hours);
  dateObj.setMinutes(mins);
  return dateObj;
}

export function validDateOrUndefined(val) {
  if (!val) return undefined;
  else return new Date(val);
}

export function dateSelector(begin, end) {
  if (!begin && !end) return undefined;
  const valueDate = {};
  if (begin) valueDate.$gte = moment(begin).toDate();
  if (end) valueDate.$lt = moment(end).add(1, 'day').toDate();
  return valueDate;
}

const smallestCurrencyUnit = 5;

export function equalWithinRounding(amount1, amount2) {
  return Math.abs(amount1 - amount2) < smallestCurrencyUnit / 2;
}

export function objectKeyCompatibleString(dottedString, newChar = '\\u002e') {
  const withoutDots = dottedString.replace(/\./g, newChar);
  if (/^\+?(0|[1-9]\d*)$/.test(withoutDots)) return '#' + withoutDots;  // Integer numbers are interpreted as array indexes if used in $set mongo operators, so in order to be able to use them as Object keys, they have to be made non-integers
  else return withoutDots;
}

export function callOrRead(variable) {
  return (typeof variable === 'function') ? variable.call(this) : variable;
}
