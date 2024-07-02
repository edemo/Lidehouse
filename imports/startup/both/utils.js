/* eslint-disable no-extend-native */
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import deepExtend from 'deep-extend';

// Source: https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
Object.getByString = function (object, string) {
  let obj = object;
  let str = string;
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (typeof obj === 'object' && key in obj) obj = obj[key];
    else return; // return undefined if not found
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

// Info: https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
Object.deepClone = function deepClone(obj) {
  const clone = {};
  $.extend(true, clone, obj);
  return clone;
};

Object.deepCloneOwn = function deepCloneOwn(obj) {
//  return _.extendOwn({}, obj);  // only available in new underscore version
  return deepExtend({}, obj);
};

Object.stringifyClone = function stringifyClone(obj) {
  return JSON.parse(JSON.stringify(obj));
};

Object.cleanUndefined = function cleanUndefined(obj) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'undefined') {
      delete obj[key];
    }
  });
  return obj;
};

Object.cleanEmptyStrings = function cleanEmptyStrings(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] === '') {
      delete obj[key];
    }
  });
  return obj;
};

String.prototype.forEachChar = function forEachChar(func) {
  for (let i = 0; i < this.length; i++) {
    func(this.charAt(i));
  }
};

String.prototype.capitalize = function capitalize() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.deaccent = function deaccent() { 
  return this.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};


Number.prototype.round = function round(decimals) {
  return Math.roundToDecimals(this, decimals);
};

Math.roundToDecimals = function roundToDecimals(number, decimals) {
  if (decimals === undefined) return number;
  if (decimals === 0) return Math.round(number);
  else return Number(number.toFixed(decimals));
};

Math.smallerInAbs = function smallerInAbs(a, b) {
  if (a >= 0 && b >= 0) return Math.min(a, b);
  else if (a <= 0 && b <= 0) return Math.max(a, b);
  // debugAssert(false); 
  return undefined;
};

// Sometimes you don't know if you are dealing with an array or a cursor. 
// So by calling fetch, you can make sure it becomes an Array
Array.difference = function difference(array1, array2) {
  const result = [];
  (array1 || []).forEach(elem1 => {
    const foundInArray2 = _.find((array2 || []), (elem2 => _.isEqual(elem1, elem2)));
    if (!foundInArray2) result.push(elem1);
  });
  return result;
};
Array.prototype.fetch = function fetch() { return this; };

Array.prototype.count = function count() { return this.length; };

Array.prototype.oppositeSignsFirst = function oppositeSignsFirst(number, key) {
  const negatives = [];
  const positives = [];
  this.forEach(elem => {
    if (elem < 0 || elem[key] < 0) negatives.push(elem);
    else positives.push(elem);
  });
  if (number >= 0) return negatives.concat(positives);
  else return positives.concat(negatives);
};

Date.equal = function equal(date1, date2) {
  return date1?.valueOf() === date2?.valueOf();
};

Date.newUTC = function newUTCDate(...params) {
  return moment.utc(...params).toDate();
};

Date.formatUTC = function formatUTCDate(date, format) {
  return moment.utc(date).format(format);
};

_.isDefined = function isDefined(obj) { // underscore did not have this
  return obj !== undefined;
};

_.isSimpleObject = function isSimpleObject(variable) {
  return Object.prototype.toString.call(variable) === '[object Object]';
};

_.deepExtend = deepExtend;

let lastTimeCheck;

console.startElapsedTime = function () {
  lastTimeCheck = Date.now();
};

console.logElapsedTime = function (text) {
  const elapsedTime = Date.now() - lastTimeCheck;
  console.log(text, elapsedTime, 'ms');
  lastTimeCheck = Date.now();
};
