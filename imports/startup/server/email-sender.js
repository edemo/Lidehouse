import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { EmailTemplates, SampleEmailTemplates } from '/imports/email/email-templates.js';
import { EmailTemplateHelpers, SampleEmailTemplateHelpers } from '/imports/email/email-template-helpers.js';
import { Notification_Layout } from '/imports/email/notification-layout.js';

/* SSR EmailSender
import fs from 'fs';
import { SSR } from 'meteor/meteorhacks:ssr';
import { Email } from 'meteor/email';

export function templateToHTML(name, context) {
  try {
    SSR.compileTemplate(
      name,
      // Use native Node read here as Assets.getText doesn't work consistently. The path here is
      // relative to .meteor/local/build/programs/server.
      fs.readFileSync(`assets/app/email/${name}.html`, 'utf8')
    );
    return SSR.render(name, context);
  } catch (exception) {
    throw new Meteor.Error('500', exception);
  }
}

export const EmailSender = {
  send(templateName, options, context) {
    Email.send({
      to: options.to,
      from: 'Honline <noreply@honline.net>',
      subject: options.subject,
      html: templateToHTML(templateName, context),
    });
  },
};
*/

Mailer.config({
  from: 'Honline <noreply@honline.net>',
//  replyTo: 'Honline <noreply@honline.net>',
  addRoutes: true,  // only allow this in debug mode
  testEmail: null,  // set your email here to be able to send by url 
  plainTextOpts: {
    ignoreImage: true,
  },
});

Meteor.startup(() => {
  Mailer.init({
    templates: EmailTemplates,     // Global Templates namespace, see lib/templates.js.
    helpers: EmailTemplateHelpers, // Global template helper namespace.
    layout: Notification_Layout,
  });
  /* --Sample--
  Mailer.init({
    templates: SampleEmailTemplates,     // Global Templates namespace, see lib/templates.js.
    helpers: SampleEmailTemplateHelpers, // Global template helper namespace.
    layout: {
      name: 'emailLayout',
      path: 'sample-email/layout.html',   // Relative to 'private' dir.
      scss: 'sample-email/layout.scss',
    },
  });-- -- */
});
