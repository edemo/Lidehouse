import { _ } from 'meteor/underscore';
import { checkExists } from '/imports/api/method-checks.js';

export function toggleElementInArray(collection, id, arrayName, element) {
  const object = checkExists(collection, id);
  const index = _.indexOf(object[arrayName], element);
  const action = (index >= 0) ? '$pull' : '$push';
  const modifier = { [action]: { [arrayName]: element } };
  collection.update(id, modifier);
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

export function equalWithinRounding(amount1, amount2) {
  return Math.abs(amount1 - amount2) < 5;
}

export function resetSession() {
  if (Meteor.isClient) {
    import { Session } from 'meteor/session';

    Object.keys(Session.keys).forEach(function unset(key) {
      Session.set(key, undefined);
    });
    Session.keys = {};
    Session.set('modalContext', {});
  }
}
