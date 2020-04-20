import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';

export let getActiveCommunityId = function getActiveCommunityId() {
  throw new Meteor.Error('On the server you need to supply the communityId, because there is no "activeCommunity"');
};

export let getActivePartnerId = function getActivePartnerId() {
  throw new Meteor.Error('On the server you need to supply the partnerId');
};

if (Meteor.isClient) {
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

  getActiveCommunityId = function getActiveCommunityId() {
    return Session.get('activeCommunityId');
  };

  getActivePartnerId = function getActivePartnerId() {
    const communityId = getActiveCommunityId();
    return Meteor.user().partnerId(communityId);
  };
}

export function getActiveCommunity() {
  const id = getActiveCommunityId();
  return Communities.findOne(id);
}

export function getActivePartner() {
  const id = getActivePartnerId();
  return Partners.findOne(id);
}

export function defaultNewDoc() {
  return { communityId: FlowRouter.getParam('_cid') || getActiveCommunityId() };
}
