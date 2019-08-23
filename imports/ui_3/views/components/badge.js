import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Topics } from '/imports/api/topics/topics.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

import '/imports/api/users/users.js';
import './badge.html';

Template.Badge.viewmodel({
  selected(helper, category) {
    return this[helper](category);
  },
  countTasks(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    const User = Meteor.user();
    topics.forEach(t => {
      if (User.hasPermission(`${category}.statusChangeTo.${t.status}.leave`)) count += 1;
    });
    return count;
  },
  countNotifications(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    topics.map(t => {
      const userId = Meteor.userId();
      count += t.needsAttention(userId, Meteor.users.SEEN_BY.EYES);
    });
    return count;
  },
  countUnapprovedEntities() {
    const communityId = Session.get('activeCommunityId');
    const unapprovedParcelCount = Parcels.find({ communityId, approved: false }).count();
    const unapprovedMembershipCount = Memberships.find({ communityId, approved: false }).count();
    return unapprovedParcelCount + unapprovedMembershipCount;
  },
});
