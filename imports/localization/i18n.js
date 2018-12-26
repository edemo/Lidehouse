import { TAPi18n } from 'meteor/tap:i18n';

export const __ = function translate(...params) {
  if (typeof (params[0]) === 'undefined') return '---'; // TAPi18n.__('undefined');
  return TAPi18n.__.apply(null, params);
};
