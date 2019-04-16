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
  return _.union(array, [element]);
}

export function deaccentLowerCase (text) { 
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
}