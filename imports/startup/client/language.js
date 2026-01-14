/* globals window */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { Tracker } from 'meteor/tracker';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import 'meteor/numeral:languages';
import { Log } from '/imports/utils/log.js';
import { availableLanguages } from '/imports/startup/both/language.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { update as updateUser } from '/imports/api/users/methods.js';
import { handleError } from '/imports/ui_3/lib/errors.js';

export function getBrowserLanguage() {
  // https://stackoverflow.com/questions/31471411/how-to-set-user-language-settings-in-meteor#31471877
  const language = window.navigator.userLanguage || window.navigator.language;  // works IE/SAFARI/CHROME/FF
//  Log.info('Browser language:', language);
  return language.split('-')[0];
}

function supportedLanguage(lang) {
  return _.contains(availableLanguages, lang) ? lang : 'en';
}

function setLanguage(lang) {
  const supportedLang = supportedLanguage(lang);
  // TODO:  Use the session var to show loading while language loads - this prevents from displaying the default language while loading
  Session.set('showLoadingIndicator', true);
  TAPi18n.setLanguage(supportedLang)
    .done(function handleSuccess() {
      Session.set('showLoadingIndicator', false);
    })
    .fail(function handleError(errorMessage) {
      Log.error(errorMessage);        // TODO: Handle the error
    });
  T9n.setLanguage(supportedLang);
}

// Logged in users have language prefenence in their settings. So if user logged in, use that. 
// Otherwise use the browser language as default
export function currentUserLanguage() {
  const user = Meteor.user();
  if (user && user.settings && user.settings.language) {
    return user.settings.language;
  } else {
    return getBrowserLanguage();
  }
}

export function setCurrentUserLanguage(lang = getBrowserLanguage()) {
  const supportedLang = supportedLanguage(lang);
  updateUser.call({ _id: Meteor.userId(), modifier: { $set: { 'settings.language': supportedLang } } }, handleError);
}

Meteor.startup(function setupLanguage() {
  Tracker.autorun(() => {
    setLanguage(currentUserLanguage());
  });

  // moment, numeral package is not reactive, need to localize it reactively
  Tracker.autorun(() => {
    const language = TAPi18n.getLanguage();
    moment.locale(language);
    numeral.language(language);
  });
//  Tracker.autorun(() => {
//    const community = getActiveCommunity();
//    const language = community ? community.settings.language : TAPi18n.getLanguage();
//    numeral.language(language);
//  });
});

// In numeral locales replacing the ' ' with a '.' in the hu locale
// Meteor.startup(function amendNumeralLocale() {
//   const huLocale = numeral.languageData('hu');
//   huLocale.delimiters.thousands = '.';
//   numeral.language('hu', huLocale);
// });

// Known problems with this language and translation system
// 1. If there is no english label, the other language labels are not used either
// 2. Need to call i18n() function AFTER tapi18n had the chance to load all traslations
//    including the extra translations for the comtypes !!!
// 3. When schema contains included Arrays
//    if you try to put label in the array, or in array.$, it creates two levels of labels
