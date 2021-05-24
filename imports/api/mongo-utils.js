import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

export function isFieldDeleted(doc, modifier, field) {
  const newDoc = rusdiff.clone(doc);
  rusdiff.apply(newDoc, modifier);
  if (Object.getByString(doc, field) && !Object.getByString(newDoc, field)) return true;
  return false;
}

export function modifierChangesField(modifier, fields) {
  let result = false;
  function checkOperator(operator) {
    _.each(operator, (value, key) => {
      if (_.contains(fields, key)) result = true;
    });
  }
  checkOperator(modifier.$set);
  checkOperator(modifier.$sunset);
  checkOperator(modifier.$inc);
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
        modifier.$unset = modifier.$sunset || {};
        modifier.$unset[arrayName] = '';
      }
    });
    delete modifier.$pull;
  }
}

export function autoValueUpdate(collection, doc, modifier, fieldName, autoValue) {
  let newDoc = rusdiff.clone(doc);
  const newModifier = rusdiff.clone(modifier);
  convertPushToSet(doc, newModifier);
  if (modifier) rusdiff.apply(newDoc, newModifier);
  newDoc = collection._transform(newDoc);
  modifier.$set = modifier.$set || {};
  modifier.$set[fieldName] = autoValue(newDoc);
}
