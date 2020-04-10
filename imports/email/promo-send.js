
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Promo_Email } from './promo-email.js';

export function sendPromoEmail(user, emailParams) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  const community = emailParams.communityId ? Communities.findOne(emailParams.communityId) : undefined;
  const communityName = community ? community.name : null;
  // Should use FlowRouterHelpers.urlFor, but it does not handle the query params
  // const loginLink = FlowRouterHelpers.urlFor('Board', {}, { demouser: 'out' });
  // const inviteMembersLink = FlowRouterHelpers.urlFor('Demo login', {}, { lang: 'hu', promo: emailParams.communityId });
  const loginLink = 'https://demo.honline.hu/board?demouser=out';
  const inviteMembersLink = `https://demo.honline.hu/demo?lang=hu&promo=${emailParams.communityId}`;

  _.extend(emailParams, { communityName, loginLink, inviteMembersLink });

  EmailSender.send({
    to: user.getPrimaryEmail(),
    subject: EmailTemplateHelpers.subject('Promo', user, community),
    template: 'Promo_Email',
    data: {
      user,
      ...{ emailParams },
      ...Promo_Email.layoutData,
    },
  });
}
