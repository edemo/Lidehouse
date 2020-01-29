import { Meteor } from 'meteor/meteor';
import { debugAssert } from '/imports/utils/assert.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Bill_Email } from './bill-email.js';

export function sendBillEmail(bill) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const partner = bill.partner();
  const emailAddress = partner.primaryEmail();
  if (!emailAddress) return;
  const user = partner.user();
  const community = bill.community();

  EmailSender.send({
    to: emailAddress,
    subject: EmailTemplateHelpers.subject('New bill', user, community),
    template: 'Bill_Email',
    data: {
      user,
      community,
      bill,
      ...Bill_Email.layoutData,
    },
  });
}
