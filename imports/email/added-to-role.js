import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';

export function sendAddedToRoleInfoEmail(user, communityId, role) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const community = Communities.findOne(communityId);
  const name = community.name;
  const link = FlowRouterHelpers.urlFor('Community show', { _cid: communityId });
  const email = community.admin()?.getPrimaryEmail();
  const language = user.settings.language;
  role = TAPi18n.__(role, {}, language);

  return EmailSender.send({
    to: user.getPrimaryEmail(),
    subject: TAPi18n.__('email.Notifications', {}, language) + ' ' + TAPi18n.__('email.fromTheCommunity', { name }, language),
    text: TAPi18n.__('email.AddedToRole', {
      name,
      role,
      link,
      email,
    }, language),
  });
}

