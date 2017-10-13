/* eslint-disable no-console */

export const Log = {
  error(...params) {
    console.error(params);
  },
  warning(...params) {
    console.warn(params);
  },
  info(...params) {
    console.info(params);
  },
};
