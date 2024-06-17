import { Meteor } from 'meteor/meteor';
import { debugAssert } from '/imports/utils/assert.js';
import { Contracts } from '/imports/api/contracts/contracts';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Outstandings_Email } from './outstandings-email.js';

export function sendOutstandingsEmail(contractId) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const contract = Contracts.findOne(contractId);
  const partner = contract.partner();
  const user = partner.user();
  const community = partner.community();
  const emailsToNotify = contract.emailsToNotify();

  return EmailSender.send({
    to: emailsToNotify.to,
    cc: emailsToNotify.cc,
    subject: EmailTemplateHelpers.subject('Outstandings', user, community),
    template: 'Outstandings_Email',
    data: {
      community,
      contract,
      ...Outstandings_Email.layoutData(partner),
    },
  });
}
