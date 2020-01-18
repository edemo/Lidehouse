import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Communities } from '../api/communities/communities';
import { Partners } from '../api/partners/partners';

export function sendOutstandingNotificationEmail(partnerId) {

  if (Meteor.isServer) {

    import { EmailSender } from '/imports/startup/server/email-sender.js';

    const partner = Partners.findOne(partnerId);
    const outstandings = Transactions.find({ partnerId: partner._id, category: 'bill', outstanding: { $gt: 0 } }).fetch();
    const community = Communities.findOne(partner.communityId);
    const language = partner.getLanguage();

    EmailSender.send({
      to: partner.contact.email,
      subject: TAPi18n.__('email.ArrearsReminder', { name: community.name }, language),
      template: 'OutstandingNotification_Email',
      data: {
        communityId: community._id,
        outstandings,
        partner,
        link: FlowRouterHelpers.urlFor('Parcels finances'),
        alertColor: 'alert-warning',
      },
    });
  }
}
