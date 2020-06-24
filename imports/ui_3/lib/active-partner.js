import { Meteor } from 'meteor/meteor';

import { Partners } from '/imports/api/partners/partners.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';


export function getActivePartnerId() {
  const communityId = getActiveCommunityId();
  const user = Meteor.user();
  return user && user.partnerId(communityId);
}

export function getActivePartner() {
  const id = getActivePartnerId();
  return Partners.findOne(id);
}
