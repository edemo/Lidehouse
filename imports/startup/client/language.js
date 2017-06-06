import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';

import { Tracker } from 'meteor/tracker';
import { moment } from 'meteor/momentjs:moment';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { comtype } from '/imports/comtypes/comtype.js';

function getDefaultLanguage() {
  return 'hu';    // Current default language is hungarian
}

// TODO:  Use the session var to show loading while language loads
// this prevents from displaying the default language while loading

Meteor.startup(function setDefaultLanguage() {
  Session.set('showLoadingIndicator', true);

  TAPi18n.setLanguage(getDefaultLanguage())
    .done(function handleSuccess() {
      Session.set('showLoadingIndicator', false);
    })
    .fail(function handleError(errorMessage) {
      // TODO: Handle the situation
      console.log(errorMessage);
    });

  T9n.setLanguage(getDefaultLanguage());

  // moment package is not reactive, need to localize it reactively
  Tracker.autorun(() => {
    moment.locale(TAPi18n.getLanguage());
  });
});

// The different community types bring in their own i18n extensions

Meteor.startup(function comtypeLanguageExtensions() {
  TAPi18n.loadTranslations(comtype.translation, 'project');
});
