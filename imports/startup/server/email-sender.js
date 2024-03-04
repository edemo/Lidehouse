import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Mailer } from 'meteor/lookback:emails';
import { Email } from 'meteor/email';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { EmailTemplates, SampleEmailTemplates } from '/imports/email/email-templates.js';
import { EmailTemplateHelpers, SampleEmailTemplateHelpers } from '/imports/email/email-template-helpers.js';
import { Generic_Layout } from '/imports/email/generic-layout.js';

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
      from: 'Honline <noreply@honline.hu>',
      subject: options.subject,
      html: templateToHTML(templateName, context),
    });
  },
};
*/

const emailRetryDelays  =  [10 * 60 * 1000, 100 * 60 * 1000, 1000 * 60 * 1000, 0];

export const EmailSender = {
  config: {
    from: 'Honline <noreply@honline.hu>',
    bcc: 'Honline <noreply@honline.hu>',
    siteName: 'Honline',
  },
  trySend(options) {
    if (options.to.includes('@demo.') || options.to.includes('@test.')) {
      Log.info(`Not sending email to: ${options.to} (demo or test address)`);
      return undefined;
    }
    const sendOptions = {
      from: this.config.from,
      to: options.to,
      bcc: this.config.bcc,
      subject: options.subject,
    };
    if (options.cc) {
      _.extend(sendOptions, {
        cc: options.cc,
      });
    }
    if (options.template) {
      _.extend(sendOptions, {
        template: options.template,
        data: options.data,
      });
      // Mailer.send calls Email.send, catches exceptions,logs it and returns false then
      return Mailer.send(sendOptions);
    } else if (options.text) {
      _.extend(sendOptions, {
        text: options.text,
      });
      try {
        Email.send(sendOptions);
        return true;
      } catch (ex) {
        Log.error(`Could not send email: ${ex.message}`, 'meteor/Email');
        return false;
      }
    } else {
      debugAssert(false, 'Email has to be html or plain text');
      return undefined;
    }
  },
  send(options) {
    const success = EmailSender.trySend(options);
    if (success === true) {
      Log.info(`Successful email sending to: ${options.to}`);
    } else if (success === false) {
      options.retries = options.retries || 0;
      const delay = emailRetryDelays[options.retries];
      options.retries += 1;
      if (delay > 0) {
        Log.error(`Could not send email to: ${options.to},  retrying in ${delay / 1000} seconds`);
        Meteor.setTimeout(() => EmailSender.send(options), delay);
      } else {
        Log.error(`Giving up on sending email to: ${options.to}`);
      }
    }
  },
};

Mailer.config({
  from: EmailSender.config.from,
//  replyTo: 'Honline <noreply@honline.hu>',
  testEmail: null,  // set your email here to be able to send by url 
  plainTextOpts: {
    ignoreImage: true,
  },
});

Meteor.startup(() => {
  Mailer.init({
    templates: EmailTemplates,     // Global Templates namespace, see lib/templates.js.
    helpers: EmailTemplateHelpers, // Global template helper namespace.
    layout: Generic_Layout,
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
