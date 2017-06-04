/* global alert */

import { TAPi18n } from 'meteor/tap:i18n';

export const displayError = (error) => {
  if (error) {
    // It would be better to not alert the error here but inform the user in some
    // more subtle way
    console.log(error);
    alert(TAPi18n.__(error.error) + '\n' + error.reason + '\n' + error.details + '\n' + error.stack); // eslint-disable-line no-alert
  }
};
