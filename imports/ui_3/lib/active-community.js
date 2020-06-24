import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Communities } from '/imports/api/communities/communities.js';

export function autosetActiveCommunity() {
  const activeCommunityId = ModalStack.getVar('communityId');
  const user = Meteor.user();
  if (user && (!activeCommunityId || !user.isInCommunity(activeCommunityId))) {
    const communities = user.communities();
    if (communities.count() > 0) {
      const activeCommunity = communities.fetch()[0];
      ModalStack.setVar('communityId', activeCommunity._id, true);
    }
  }
}

export function getActiveCommunityId() {
  return ModalStack.getVar('communityId');
}

export function getActiveCommunity() {
  const id = getActiveCommunityId();
  return Communities.findOne(id);
}

export function defaultNewDoc() {
  return { communityId: FlowRouter.getParam('_cid') || getActiveCommunityId() };
}
