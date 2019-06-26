/* eslint no-console: "off" */
/* eslint no-debugger: "off" */
import { Meteor } from 'meteor/meteor';

export function debugAssert(expr, msg) {
  if (!expr) {
    console.log('Debug assertion failed:', msg);
    debugger;
    throw new Meteor.Error('Debug assertion failed', msg, expr);
  }
}

export function releaseAssert(expr, msg) {
  if (!expr) {
    console.log('Release assertion failed:', msg);
    throw new Meteor.Error('Failed assert', msg, expr);
  }
}
