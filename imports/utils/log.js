/* eslint-disable no-console */
import { moment } from 'meteor/momentjs:moment';

function timestamp() {
  return `[${moment().format()}]`;
}

export const Log = {
  error(...params) {
    console.error(timestamp(), ...params);
  },
  warning(...params) {
    console.warn(timestamp(), ...params);
  },
  info(...params) {
    console.info(timestamp(), ...params);
  },
};
