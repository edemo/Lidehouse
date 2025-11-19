/* eslint no-console: "off" */
/* eslint no-debugger: "off" */
import { Meteor } from 'meteor/meteor';
import { Log } from '/imports/utils/log.js';

export function debugAssert(expr, msg, details) {
  if (!expr) {
    const error = new Meteor.Error('Debug assertion failed', msg, JSON.stringify(details));
    Log.error('Debug assertion failed:', msg, JSON.stringify(details));
    Log.error(error.stack);
    debugger;
    throw error;
  }
}

export function productionAssert(expr, msg, details) {
  if (!expr) {
    Log.error('Production assertion failed:', msg, JSON.stringify(details));
    throw new Meteor.Error('err_notAllowed', msg, JSON.stringify(details));
  }
}
