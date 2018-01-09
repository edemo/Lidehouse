/* globals window */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';

import { Tracker } from 'meteor/tracker';
import { moment } from 'meteor/momentjs:moment';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { comtype } from '/imports/comtypes/comtype.js';

function getBrowserLanguage() {
  // https://stackoverflow.com/questions/31471411/how-to-set-user-language-settings-in-meteor#31471877
  const language = window.navigator.userLanguage || window.navigator.language;  // works IE/SAFARI/CHROME/FF
  console.log('Browser language:', language);
  return language.split('-')[0];
}

Meteor.startup(function setLanguage() {
  // TODO:  Use the session var to show loading while language loads
  // this prevents from displaying the default language while loading
  Session.set('showLoadingIndicator', true);
  TAPi18n.setLanguage(getBrowserLanguage())
    .done(function handleSuccess() {
      Session.set('showLoadingIndicator', false);
    })
    .fail(function handleError(errorMessage) {
      // TODO: Handle the situation
      console.log(errorMessage);
    });
  T9n.setLanguage(getBrowserLanguage());

  // Logged in users have language prefenence in their settings. So if user logs in, use that.
  Tracker.autorun(() => {
    const user = Meteor.user();
    if (user && user.settings && user.settings.language) {
      TAPi18n.setLanguage(user.settings.language);
      T9n.setLanguage(user.settings.language);
    } else {
      TAPi18n.setLanguage(getBrowserLanguage());
      T9n.setLanguage(getBrowserLanguage());
    }
  });

  // moment package is not reactive, need to localize it reactively
  Tracker.autorun(() => {
    moment.locale(TAPi18n.getLanguage());
  });
});

// The different community types bring in their own i18n extensions

Meteor.startup(function comtypeLanguageExtensions() {
  TAPi18n.loadTranslations(comtype.translation, 'project');
});

// Note: Currently this is run on the CLIENT ONLY
// So comtype transaltions will not be available on the server.

// Known problems with this language and translation system
// 1. If there is no english label, the other language labels are not used either
// 2. Need to call i18n() function AFTER tapi18n had the chance to load all traslations
//    including the extra translations for the comtypes !!!
// 3. When schema contains included Arrays
//    if you try to put label in the array, or in array.$, it creates two levels of labels
