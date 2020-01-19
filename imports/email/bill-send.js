import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { debugAssert } from '/imports/utils/assert.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';

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
    subject: EmailTemplateHelpers.subject('Bill', user, community),
    template: 'Bill_Email',
    data: {
      type: 'Bill',
      user,
      community,
      bill,
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
    },
  });
}
