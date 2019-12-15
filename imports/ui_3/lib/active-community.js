import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Communities } from '../../api/communities/communities';

export function autosetActiveCommunity() {
  const activeCommunityId = Session.get('activeCommunityId');
  const user = Meteor.user();
  if (user && (!activeCommunityId || !user.isInCommunity(activeCommunityId))) {
    const communities = user.communities();
    if (communities.count() > 0) {
      const activeCommunity = communities.fetch()[0];
      Session.set('activeCommunityId', activeCommunity._id);
    }
  }
}

export function getVisibleCommunityId() {
  console.log('communityId');
  console.log('FLOW', FlowRouter.getParam('_cid'));
  console.log('SESSION', Session.get('activeCommunityId'));
  
  return FlowRouter.getParam('_cid') || Session.get('activeCommunityId');
}

export function getVisibleCommunity() {
  const id = getVisibleCommunityId();
  return Communities.findOne(id);
}
