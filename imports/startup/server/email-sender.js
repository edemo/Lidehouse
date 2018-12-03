import fs from 'fs';
import { Meteor } from 'meteor/meteor';
import { SSR, Template } from 'meteor/meteorhacks:ssr';
import { Email } from 'meteor/email';

// name (filename!) should be snake_case, as template names cannot contain hyphens
export function templateToHTML(name, context, helpers) {
  try {
    SSR.compileTemplate(
      name,
      // Use native Node read here as Assets.getText doesn't work consistently. The path here is
      // relative to .meteor/local/build/programs/server.
      fs.readFileSync(`assets/app/email/${name}.html`, 'utf8')
    );
    if (helpers) { Template[name].helpers(helpers); };
    return SSR.render(name, context);
  } catch (exception) {
    throw new Meteor.Error('500', exception);
  }
}

export const EmailSender = {
  send(templateName, options, context) {        //helpers
    Email.send({
      to: options.to,
      from: 'Honline <noreply@honline.net>',
      subject: options.subject,
      html: templateToHTML(templateName, context), //helpers
    });
  },
};
