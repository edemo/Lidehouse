import { Meteor } from 'meteor/meteor';
import { debugAssert } from '/imports/utils/assert.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Bill_Email } from './bill-email.js';

export function sendBillEmail(bill) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const community = bill.community();
  const partner = bill.partner();
  const contract = bill.contract();
  const emailsToNotify = contract ? contract.emailsToNotify() : { to: partner.primaryEmail() };
  const user = partner.user();

  if (!user || user.settings.getBillEmail) {
    return EmailSender.send({
      to: emailsToNotify.to,
      cc: emailsToNotify.cc,
      subject: EmailTemplateHelpers.subject('New bill', user, community),
      template: 'Bill_Email',
      data: {
        community,
        bill,
        ...Bill_Email.layoutData,
      },
    });
  }
}
