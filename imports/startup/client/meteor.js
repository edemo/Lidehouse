import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

// We need to make the client calls noRetry, bacause our methods are not idempotent (should not be called twice),
// This can only be done using Meteor.apply instead of Meteor.call
// Meteor.call(name, [arg1, arg2...], [asyncCallback])
// Meteor.apply(name, args, [options], [asyncCallback])
Meteor.call = function callWoRetry(name, ...args) {
  const options = { noRetry: true };
  let asyncCallback;
  if (typeof _.last(args) === 'function') {
    asyncCallback = args.pop();
  }
  return Meteor.apply(name, args, options, asyncCallback);
};

Meteor._origApply = Meteor.apply;
Meteor.apply = function applyWoRetry(name, args, options, asyncCallback) {
  const optionsWoRetry = _.extend(options, { noRetry: true });
  return Meteor._origApply(name, args, optionsWoRetry, asyncCallback);
};
