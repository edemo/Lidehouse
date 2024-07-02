/* global alert toastr */
/* eslint-disable no-alert, no-console, prefer-template */
import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';
import { Log } from '/imports/utils/log.js';

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

function ___(bundle) {
  if (typeof bundle === 'string') {
    return __(bundle);
  } else if (typeof bundle === 'object') {
    return bundle.map((elem, index) => `${index}:${__(elem)})`);
  } else return undefined;
}

export const displayError = (error) => {
  if (error) {
    Log.error(error);
    let message;
    if (error instanceof Meteor.Error) {
      // For server side errors, on the client side we always get a Meteor.Error, that is what gets channeled over DDP.
      message = ___(error.error) + '\n' + ___(error.reason) + '\n' + JSON.stringify(error.details);
    } else {
      message = (error.message);
    }
    if (Meteor.isDevelopment) message += '\n\n' + error.stack;
    alert(message); // It would be better to not alert the error here but inform the user in some more subtle way
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
