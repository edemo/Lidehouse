import { Meteor } from 'meteor/meteor';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Outstandings_Email } from './outstandings-email.js';

export function sendOutstandingsEmail(partnerId) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const partner = Partners.findOne(partnerId);
  const user = partner.user();
  const community = partner.community();
  const email = partner.primaryEmail();

  if (!email) return;

  return EmailSender.send({
    to: email,
    subject: EmailTemplateHelpers.subject('Outstandings', user, community),
    template: 'Outstandings_Email',
    data: {
      user,
      community,
      partner,
      ...Outstandings_Email.layoutData(partner),
    },
  });
}
