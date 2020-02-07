/* eslint-disable no-extend-native */
import { _ } from 'meteor/underscore';

// Source: https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
Object.getByString = function (object, string) {
  let obj = object;
  let str = string;
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (key in obj) obj = obj[key];
    else return;
  }
  return obj;
};

Object.setByString = function (object, string, value) {
  let obj = object;
  let str = string;
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (i === n - 1) obj[key] = value;
    else {
      if (!(key in obj)) obj[key] = {};
      obj = obj[key];
    }
  }
};

// Source: http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
Object.isEquivalent = function isEquivalent(a, b) {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  // Create arrays of property names
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);
  // If number of properties is different, objects are not equivalent
  if (aProps.length != bProps.length) {
    return false;
  }
  for (let i = 0; i < aProps.length; i++) {
    const propName = aProps[i];
    // If values of same property are not equal, objects are not equivalent
    if (a[propName] !== b[propName]) {
      return false;
    }
  }
  // If we made it this far, objects are considered equivalent
  return true;
};

String.prototype.forEachChar = function forEachChar(func) {
  for (let i = 0; i < this.length; i++) {
    func(this.charAt(i));
  }
};

String.prototype.capitalize = function capitalize() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

Number.prototype.round = function round(places) {
//  return Math.round((this * 100) + Number.EPSILON) / 100;
  return +(Math.round(this + 'e+' + places) + 'e-' + places);
};

_.isDefined = function (obj) { // underscore did not have this
  return obj !== undefined;
};
