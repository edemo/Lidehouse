import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { Accounts } from 'meteor/accounts-base';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { EmailSender } from '/imports/startup/server/email-sender.js';

if (Meteor.settings.mailSender) {
  process.env.MAIL_URL = Meteor.settings.mailSender;
}

// When translating to non-english languages, we include the english version at the end, as an extra safety against wrong lang setting
// context must be an object, see: https://github.com/TAPevents/tap-i18n/issues/196
function dualTranslate(symbol, context, lang, separator) {
  const translatedContext = _.clone(context);
  translatedContext.role = TAPi18n.__(context.role, {}, lang);
  translatedContext.communityType = TAPi18n.__(context.communityType, {}, lang);
  let result = TAPi18n.__(symbol, translatedContext, lang);
  if (lang !== 'en') {
    _.extend(context, { lng: 'en' }); 
    if (separator === '/') result += ' (' + TAPi18n.__(symbol, context) + ')';
    if (separator === '-') result += '\n\n[English]\n' + TAPi18n.__(symbol, context);
  }
  return result;
}

// Accounts.emailTemplates

Accounts.emailTemplates.siteName = EmailSender.config.siteName;
Accounts.emailTemplates.from = EmailSender.config.from;

Accounts.emailTemplates.enrollAccount = {
  subject(user) {
    const partner = Partners.findOne({ 'contact.email': user.emails[0].address });
    const community = partner.community();
    return dualTranslate('email.EnrollAccountSubject', {
      name: community.name,
    }, user.language(), '/');
  },
  text(user, url) {
    const partner = Partners.findOne({ 'contact.email': user.emails[0].address });
    const community = partner.community();
    const membership = Memberships.find({ partnerId: partner._id }, { sort: { createdAt: -1 } }).fetch()[0];
    const adminEmail = community.admin()?.getPrimaryEmail();
    return dualTranslate('email.EnrollAccount', {
      name: community.name,
      communityType: community.displayType(),
      role: community.specificTermFor(membership.role),
      email: adminEmail,
      url,
    },
    user.language(), '-');
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