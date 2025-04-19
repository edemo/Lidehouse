import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

export function isFieldDeleted(doc, modifier, field) {
  const newDoc = rusdiff.clone(doc);
  rusdiff.apply(newDoc, modifier);
  if (Object.getByString(doc, field) && !Object.getByString(newDoc, field)) return true;
  return false;
}

export function modifierChangesField(oldDoc, newDoc, fields) {
  let result = false;
  for (const field of fields) {
    if (!_.isEqual(newDoc[field], oldDoc[field])) {
      result = true;
      break;
    }
  }
  return result;
}

function convertPushToSet(doc, modifier) {
  if (modifier.$push) {
    _.each(modifier.$push, (value, arrayName) => {
      const newValue = (Object.getByString(doc, arrayName) || []).concat(value);
      modifier.$set = modifier.$set || {};
      modifier.$set[arrayName] = newValue;
    });
    delete modifier.$push;
  }
  if (modifier.$pull) {
    _.each(modifier.$pull, (value, arrayName) => {
      const newValue = _.without(Object.getByString(doc, arrayName) || [], value);
      if (newValue.length) {
        modifier.$set = modifier.$set || {};
        modifier.$set[arrayName] = newValue;
      } else {
        modifier.$unset = modifier.$unset || {};
        modifier.$unset[arrayName] = '';
      }
    });
    delete modifier.$pull;
  }
}

export function autoValueUpdate(collection, doc, modifier, fieldName, autoValue) {
  let newDoc = rusdiff.clone(doc);
  const convertedModifier = rusdiff.clone(modifier);
  convertPushToSet(doc, convertedModifier);   // rus-diff does not recognize $push, $pull operations: https://github.com/mirek/node-rus-diff/issues/6
  if (modifier) rusdiff.apply(newDoc, convertedModifier);
  newDoc = collection._transform(newDoc);
  const calculatedValue = autoValue(newDoc);
  if (calculatedValue === undefined || calculatedValue === '') {
    modifier.$unset = modifier.$unset || {};
    modifier.$unset[fieldName] = '';
  } else {
    modifier.$set = modifier.$set || {};
    modifier.$set[fieldName] = calculatedValue;
  }
}
