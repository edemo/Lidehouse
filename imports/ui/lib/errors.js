/* global alert toastr*/

import { TAPi18n } from 'meteor/tap:i18n';

export const displayError = (error) => {
  if (error) {
    // It would be better to not alert the error here but inform the user in some
    // more subtle way
    console.log(error);
    alert(TAPi18n.__(error.error) + '\n' + error.reason + '\n' + error.details + '\n' + error.stack); // eslint-disable-line no-alert
  }
};

toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: true,
  progressBar: false,
  positionClass: 'toast-bottom-right',
  preventDuplicates: false,
  onclick: null,
  showDuration: '300',
  hideDuration: '1000',
  timeOut: '5000',
  extendedTimeOut: '1000',
  showEasing: 'swing',
  hideEasing: 'linear',
  showMethod: 'fadeIn',
  hideMethod: 'fadeOut',
};

export const displayMessage = (level, ...params) => {
  toastr[level](TAPi18n.__.apply(this, params));
};
