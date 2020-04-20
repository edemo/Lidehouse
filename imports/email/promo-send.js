
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Promo_Launch_Link, Promo_Invite_Link } from './promo-email.js';


export function sendPromoLaunchLink(params) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  EmailSender.send({
    to: params.admin.email,
    subject: EmailTemplateHelpers.subject('Promo', null, params.community),
    template: 'Promo_Launch_Link',
    data: {
      ...params,
      ...Promo_Launch_Link.layoutData,
    },
  });
}

export function sendPromoInviteLink(user, community) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  EmailSender.send({
    to: user.getPrimaryEmail(),
    subject: EmailTemplateHelpers.subject('Promo', user, community),
    template: 'Promo_Invite_Link',
    data: {
      user,
      community,
      ...Promo_Invite_Link.layoutData,
    },
  });
}
