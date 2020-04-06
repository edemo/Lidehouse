
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Promo_Email } from './promo-email.js';

export function sendPromoEmail(user, emailParams) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  const community = emailParams.communityId ? Communities.findOne(emailParams.communityId) : undefined;
  const communityName = community ? community.name : null;
  const loginLink = 'https://demo.honline.hu/signin';
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
