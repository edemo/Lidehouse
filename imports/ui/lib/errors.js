/* global alert toastr */
/* eslint-disable no-alert, no-console, prefer-template */
import { DEBUG } from '/utils/debug.js';
import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';

//------------------------
// structure of errors
//------------------------
// Meteor.Error(Number, "description");
// error.error (code)
// error.reason
// error.details
// error.stack
// error.message ([error.error] + error.reason)
//
// Aldeed:collection2 throws:
// error.message
// error.stack (err.message + stacktrace)
//-----------------------------------------

export const displayError = (error) => {
  if (error) {
    console.error(error);
    let message;
    if (error instanceof Meteor.Error) {
      // For server side errors, on the client side we always get a Meteor.Error, that is what gets channeled over DDP.
      message = __(error.error) + '\n' + __(error.reason) + '\n' + error.details;
    } else {
      message = __(error.message);
    }
    if (DEBUG) message += '\n\n' + error.stack;
    alert(message);     // It would be better to not alert the error here but inform the user in some more subtle way
  }
};

export const onSuccess = cb =>
  function handler(err, res) {
    if (err) {
      displayError(err);
      return;
    }
    cb(res);
  };

export const handleError = onSuccess(() => {});

export const displayMessage = (level, ...params) =>
  toastr[level](__(...params));

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
