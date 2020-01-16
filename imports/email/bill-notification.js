import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '../api/communities/communities';
import { Partners } from '../api/partners/partners';

export function sendBillNotificationEmail(bill) {

  import { emailSender } from '/imports/startup/server/email-sender.js';

  const partner = Partners.findOne(bill.partnerId);
  const emailAddress = partner.primaryEmail();
  const language = partner.getLanguage();
  if (!emailAddress) return;
  const community = Communities.findOne(bill.communityId);

  emailSender.sendHTML({
    to: emailAddress,
    subject: TAPi18n.__('email.BillNotification', { name: community.name }, language),
    template: 'BillNotification_Email',
    data: {
      bill,
      partner,
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
      communityId: community._id,
      footer: TAPi18n.__('email.defaultFooter', {}, language),
    },
  });
}
