import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { Accounts } from 'meteor/accounts-base';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';

if (Meteor.settings.mailSender) {
  process.env.MAIL_URL = Meteor.settings.mailSender;
}

// Accounts.emailTemplates

Accounts.emailTemplates.siteName = 'Honline';
Accounts.emailTemplates.from = 'Honline <noreply@honline.net>';

Accounts.emailTemplates.enrollAccount = {
  subject(user) { return TAPi18n.__('emailEnrollAccountSubject', {}, user.language()); },
  text(user, url) {
    const membership = Memberships.findOne({ 'person.userEmail': user.emails[0].address });
    const community = membership.community();
    const adminEmail = community.admin().person.email();
    return TAPi18n.__('emailEnrollAccount',
      { name: community.name,
        role: TAPi18n.__(membership.role, {}, user.language()),
        email: adminEmail,
        url,
      },
      user.language()
    );
  }
};

Accounts.emailTemplates.verifyEmail = {
  subject(user) { return TAPi18n.__('emailVerifyEmailSubject', {}, user.language()); },
  text(user, url) {
    return TAPi18n.__('emailVerifyEmail', { url }, user.language()
  );
  }
};

Accounts.emailTemplates.resetPassword = {
  subject(user) { return TAPi18n.__('emailResetPasswordSubject', {}, user.language()); },
  text(user, url) {
    return TAPi18n.__('emailResetPassword', { url }, user.language()
  );
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