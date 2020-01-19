import { Meteor } from 'meteor/meteor';
import { EmailSender } from '/imports/startup/server/email-sender.js';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { debugAssert } from '/imports/utils/assert.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Communities } from '../api/communities/communities';
import { Partners } from '../api/partners/partners';
import { EmailTemplateHelpers } from './email-template-helpers.js';

export function sendOutstandingsEmail(partnerId) {
  debugAssert(Meteor.isServer);
  const partner = Partners.findOne(partnerId);
  const user = partner.user();
  const outstandings = Transactions.find({ partnerId: partner._id, category: 'bill', outstanding: { $gt: 0 } }).fetch();
  const community = Communities.findOne(partner.communityId);

  EmailSender.send({
    to: partner.contact.email,
    subject: EmailTemplateHelpers.subject('Outstandings', user, community),
    template: 'Outstandings_Email',
    data: {
      type: 'Outstandings',
      communityId: community._id,
      outstandings,
      partner,
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
    },
  });
}
