/* eslint-disable no-console */
import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';

function timestamp() {
  return `[${moment().format()}]`;
}

export const Log = {
  levels: ['error', 'warning', 'info', 'debug'],
  level: 0,
  levelIsHigherThan(text) {
    return Log.levels.indexOf(text) >= Log.levels.indexOf(Log.level);
  },
  error(...params) {
    if (Log.level >= 0) console.error(timestamp(), ...params);
  },
  warning(...params) {
    if (Log.level >= 1) console.warn(timestamp(), ...params);
  },
  info(...params) {
    if (Log.level >= 2) console.info(timestamp(), ...params);
  },
  debug(...params) {
    if (Log.level >= 3) console.debug(timestamp(), ...params);
  },
};

Meteor.startup(() => {
  const logLevel = Log.levels.indexOf(Meteor.settings.logLevel || 'info');
  Log.level = (logLevel > 0) ? logLevel : 2;
  console.log('Log level:', Log.levels[Log.level]);
});
