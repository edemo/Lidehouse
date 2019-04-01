import { _ } from 'meteor/underscore';

// https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
Object.byString = function (obj, str) {
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (key in obj) {
      obj = obj[key];
    } else {
      return;
    }
  }
  return obj;
};

_.isDefined = function (obj) { // underscore did not have this
  return obj !== undefined;
};
