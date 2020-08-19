/* eslint no-console: "off" */
/* eslint no-debugger: "off" */
import { Meteor } from 'meteor/meteor';
import { Log } from '/imports/utils/log.js';

export function debugAssert(expr, msg) {
  if (!expr) {
    Log.error('Debug assertion failed:', msg);
    debugger;
    throw new Meteor.Error('Debug assertion failed', msg, expr);
  }
}

export function productionAssert(expr, err, msg) {
  if (!expr) {
    Log.error('Release assertion failed:', msg);
    throw new Meteor.Error(err, msg, expr);
  }
}
