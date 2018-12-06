import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { Accounts } from 'meteor/accounts-base';
import { Memberships } from '/imports/api/memberships/memberships.js';

if (Meteor.settings.mailSender) {
  process.env.MAIL_URL = Meteor.settings.mailSender;
}

// When translating to non-english languages, we include the english version at the end, as an extra safety against wrong lang setting
function dualTranslate(symbol, context, lang, separator) {
  let result = TAPi18n.__(symbol, context, lang);
// Transalting to one language, then translating to a different one, does not work (something in TAPI keeps transalting to the first lang)
// so we now make the hungarian translation itself include an english translation as well (for enrollment)
//  if (lang !== 'en') {
//    if (separator === '/') result += ' (' + TAPi18n.__(symbol, context, 'en') + ')';
//    if (separator === '-') result += '\n\n[English]\n' + TAPi18n.__(symbol, context, 'en');
//  }
  return result;
}

// Accounts.emailTemplates

Accounts.emailTemplates.siteName = 'Honline';
Accounts.emailTemplates.from = 'Honline <noreply@honline.net>';

Accounts.emailTemplates.enrollAccount = {
  subject(user) { return dualTranslate('email.EnrollAccountSubject', {}, user.language(), '/'); },
  text(user, url) {
    const membership = Memberships.findOne({ 'person.userEmail': user.emails[0].address });
    const community = membership.community();
    const adminEmail = community.admin().getPrimaryEmail();
    return dualTranslate('email.EnrollAccount',
      { name: community.name,
        role: TAPi18n.__(membership.role, {}, user.language()),
        email: adminEmail,
        url,
      },
      user.language(),
      '-',
    );
  },
};

Accounts.emailTemplates.verifyEmail = {
  subject(user) { return dualTranslate('email.VerifyEmailSubject', {}, user.language(), '/'); },
  text(user, url) {
    return dualTranslate('email.VerifyEmail', { url }, user.language(), '-');
  },
};

Accounts.emailTemplates.resetPassword = {
  subject(user) { return dualTranslate('email.ResetPasswordSubject', {}, user.language(), '/'); },
  text(user, url) {
    return dualTranslate('email.ResetPassword', { url }, user.language(), '-');
  },
};

//   html(user, url) {
//     return `
//       XXX Generating HTML emails that work across different email clients is a very complicated
//       business that we're not going to solve in this particular example app.
//
//       A good starting point for making an HTML email could be this responsive email boilerplate:
//       https://github.com/leemunroe/responsive-html-email-template
//
//       Note that not all email clients support CSS, so you might need to use a tool to inline
//       all of your CSS into style attributes on the individual elements.
// `
//   }