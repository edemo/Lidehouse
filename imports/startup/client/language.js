/* globals window */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { Tracker } from 'meteor/tracker';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import 'meteor/numeral:languages';

import { update as usersUpdate } from '/imports/api/users/methods.js';

export function getBrowserLanguage() {
  // https://stackoverflow.com/questions/31471411/how-to-set-user-language-settings-in-meteor#31471877
  const language = window.navigator.userLanguage || window.navigator.language;  // works IE/SAFARI/CHROME/FF
//  console.log('Browser language:', language);
  return language.split('-')[0];
}

function setLanguage(lang) {
  // TODO:  Use the session var to show loading while language loads - this prevents from displaying the default language while loading
  Session.set('showLoadingIndicator', true);
  TAPi18n.setLanguage(lang)
    .done(function handleSuccess() {
      Session.set('showLoadingIndicator', false);
    })
    .fail(function handleError(errorMessage) {
      console.log(errorMessage);        // TODO: Handle the error
    });
  T9n.setLanguage(lang);
}

Meteor.startup(function setupLanguage() {
  setLanguage(getBrowserLanguage());

  // Logged in users have language prefenence in their settings. So if user logs in, use that.
  Tracker.autorun(() => {
    const user = Meteor.user();
    if (user && user.settings && user.settings.language) {
      setLanguage(user.settings.language);
    } else {
      setLanguage(getBrowserLanguage());
      // If the user has no language setting, set the browser language for her
      if (user) {
        usersUpdate.call({ _id: user._id, modifier: {
          $set: { 'settings.language': getBrowserLanguage() },
        },
        });
      }
    }
  });

  // moment, numeral package is not reactive, need to localize it reactively
  Tracker.autorun(() => {
    moment.locale(TAPi18n.getLanguage());
    numeral.language(TAPi18n.getLanguage());
  });
});

// In numeral locales replacing the ' ' with a '.' in the hu locale
Meteor.startup(function amendNumeralLocale() {
  const huLocale = numeral.languageData('hu');
  huLocale.delimiters.thousands = '.';
  numeral.language('hu', huLocale);
});

export function currentUserLanguage() {
  return Meteor.user().settings.language || 'en';
}

// Known problems with this language and translation system
// 1. If there is no english label, the other language labels are not used either
// 2. Need to call i18n() function AFTER tapi18n had the chance to load all traslations
//    including the extra translations for the comtypes !!!
// 3. When schema contains included Arrays
//    if you try to put label in the array, or in array.$, it creates two levels of labels
