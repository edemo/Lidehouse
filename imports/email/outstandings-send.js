import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners';
import { EmailTemplateHelpers } from './email-template-helpers.js';

export function sendOutstandingsEmail(partnerId) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const partner = Partners.findOne(partnerId);
  const user = partner.user();
  const community = partner.community();

  EmailSender.send({
    to: partner.contact.email,
    subject: EmailTemplateHelpers.subject('Outstandings', user, community),
    template: 'Outstandings_Email',
    data: {
      type: 'Outstandings',
      user,
      community,
      partner,
      link: FlowRouterHelpers.urlFor('Parcels finances'),
      alertColor: 'alert-warning',
    },
  });
}
