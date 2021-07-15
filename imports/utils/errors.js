import { Meteor } from 'meteor/meteor';

function bundle(array, fieldName) {
  let result = '';
  array.forEach((elem, index) => { result += `[${index}] ${JSON.stringify(elem[fieldName])} `; });
  return result;
}

export function newBundledErrors(errors) {
  return new Meteor.Error(bundle(errors, 'error'), bundle(errors, 'reason'), bundle(errors, 'details'));
}
