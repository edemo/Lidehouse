import { Meteor } from 'meteor/meteor';

function bundle(array, fieldName) {
  const result = array.map(elem => elem[fieldName]);
  return result;
}

export function newBundledErrors(errors) {
  return new Meteor.Error(bundle(errors, 'error'), bundle(errors, 'reason'), bundle(errors, 'details'));
}
