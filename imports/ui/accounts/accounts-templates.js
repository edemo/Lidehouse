import { Template } from 'meteor/templating';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { __ } from '/imports/localization/i18n.js';
import { signinRedirectRoute } from '/imports/startup/both/useraccounts-configuration.js';
import './accounts-templates.html';


// We identified the templates that need to be overridden by looking at the available templates
// here: https://github.com/meteor-useraccounts/unstyled/tree/master/lib
Template['override-atPwdFormBtn'].replaces('atPwdFormBtn');
Template['override-atPwdForm'].replaces('atPwdForm');
Template['override-atTextInput'].replaces('atTextInput');
Template['override-atTitle'].replaces('atTitle');
// Template['override-atError'].replaces('atError');
Template['override-atSignupLink'].replaces('atSignupLink');
Template['override-atSigninLink'].replaces('atSigninLink');
Template['override-atResendVerificationEmailLink'].replaces('atResendVerificationEmailLink');

Template.atTitle.helpers({
  subtitle() {
    const state = AccountsTemplates.getState();
    const forced = ((state === 'signIn') && signinRedirectRoute) ? '_Forced' : ''; // If Signin is forced, the subtitle is a different one
    return __('userAccountsSubtitle.' + state + forced);
  },
});

Template.atResendVerificationEmailLink.helpers({
  errorOrMessage() {
    return AccountsTemplates.state.form.get('error') || AccountsTemplates.state.form.get('message');
  },
});
