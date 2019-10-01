import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';

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
