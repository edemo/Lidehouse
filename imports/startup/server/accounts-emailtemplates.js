import { Accounts } from 'meteor/accounts-base';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';

Accounts.emailTemplates.siteName = 'Honline';
Accounts.emailTemplates.from = 'Honline <noreply@honline.net>';

Accounts.emailTemplates.enrollAccount = {
  subject(user) { return 'Enrollment to Honline'; },
  text(user, url) {
    const membership = Memberships.findOne({ 'person.userEmail': user.emails[0].address });
    const community = membership.community();
    const adminEmail = community.admin().userEmailAddress();

    return `Hello,
    
You have been added as a member of community ${community.name} with role: ${membership.role}.
If you think you have been added by accident, or in fact not want to be part of that community,
please contact the community administrator at ${adminEmail}, and ask him to remove you.

You have been also invited to join the condominium management system,
where you can follow the community issues, discuss them and even vote on them.
You can start enjoying all its benefits as soon as you register your account with this email address.

The following link takes you to our simple one click registration:
${url}

Thanks,
The Honline team`;
  }
};

Accounts.emailTemplates.verifyEmail = {
  subject(user) { return 'Verify your email address on Honline'; },
  text(user, url) {
    return `Dear ${user},

You have been registered as a user at honline.hu with this email address.
To confirm your registration please verify your email address within two weeks.
To verify your account email simply click the link below:
${url}

Thanks,
The Honline team`;
  }
};

Accounts.emailTemplates.resetPassword = {
  subject() { return 'Reset your password on Honline'; },
  text(user, url) {
    return `Hello!

Click the link below to reset your password on Honline.

${url}

If you didn't request this email, please ignore it.

Thanks,
The Honline team
    `;
  },
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
};