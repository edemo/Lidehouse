/* global alert toastr */
/* eslint-disable no-alert, no-console */
import { __ } from '/imports/localization/i18n.js';

export const displayError = (error) => {
  if (error) {
    // It would be better to not alert the error here but inform the user in some more subtle way
    console.log(error);
    alert(__(error.error) + '\n' + error.reason + '\n' + error.details + '\n' + error.stack);
  }
};

export const onSuccess = (cb) => {
  return function handler(err, res) {
    if (err) {
      displayError(err);
      return;
    }
    cb(res);
  };
};

export const handleError = () => {
  onSuccess(() => {});
};

export const displayMessage = (level, ...params) => {
  toastr[level](__(...params));
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
