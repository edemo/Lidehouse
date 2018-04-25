import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// import { ActiveRoute } from 'meteor/zimme:active-route';
// import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import '/imports/api/users/users.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import { feedbacksSchema } from '/imports/api/topics/feedbacks/feedbacks.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { debugAssert } from '/imports/utils/assert.js';

import './navigation.html';

Template.Navigation.onRendered(function() {
    // Initialize metisMenu
    $('#side-menu').metisMenu();
});

Template.Navigation.helpers({
  countNotifications(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    topics.map(t => {
      const userId = Meteor.userId();
      switch (category) {
        case 'room':
          if (t.isUnseenBy(userId) || t.unseenCommentsBy(userId) > 0) count += 1;
          break;
        case 'vote':
          if (!t.closed && !t.hasVotedIndirect(userId)) count += 1;
          break;
        case 'ticket':
          if (!t.closed && t.ticket.status !== 'closed') count += 1;
          break;
        case 'feedback':
          if (t.isUnseenBy(userId)) count += 1;
          break;
        default:
          debugAssert(false);
      }
    });
    return count;
  },
  countUnapprovedEntities() {
    const communityId = Session.get('activeCommunityId');
    const unapprovedParcelCount = Parcels.find({ communityId, approved: false }).count();
    const unapprovedMembershipCount = Memberships.find({ communityId, approved: false }).count();
    return unapprovedParcelCount + unapprovedMembershipCount;
  },
  developerMode() {
    return false;     // set this true to access developer features
  },
});
