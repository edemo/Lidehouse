/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Memberships } from '/imports/api/memberships/memberships';
import { Topics } from '/imports/api/topics/topics';
import { Comments } from '/imports/api/comments/comments.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Communities } from './communities.js';

// This publication sends only very basic data about what communities exist on this server
Meteor.publish('communities.listing', function communitiesListing() {
  return Communities.find({}, { fields: Communities.publicFields });
});

// This publication gives detailed data about a specific community
function communityPublication(userId, _id) {
  const user = Meteor.users.findOneOrNull(userId);
  const hasPermission = function (permissionName) {
    return user.hasPermission(permissionName, _id);
  };

  return {
    find() {
      const fields = hasPermission('communities.details') ? {} : Communities.publicFields;
      return Communities.find(_id, { fields });
    },
    // ...Related to Community
    children: [{
      // Publish the Memberships of the Community
      find(community) {
        if (hasPermission('memberships.inCommunity')) {
          return Memberships.find({ communityId: community._id });
        } // Otherwise, only the active leaders of the community can be seen
        return Memberships.find({ communityId: community._id, active: true, role: { $in: leaderRoles } });
      },

      // ...Related to Memberships
      children: [{
        // Publish the User of the Membership
        find(membership) {
          return Meteor.users.find({ _id: membership.person.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }, {
      // Publish the Parcels of the Community
      find(community) {
        if (hasPermission('parcels.inCommunity')) {
          return Parcels.find({ communityId: community._id });
        }
        return undefined;
      },
    }, {
      // Publish the Topics of the Community
      find(community) {
        if (hasPermission('topics.inCommunity')) {
          const selector = {
            communityId: community._id,
            // Filter for 'No participantIds (meaning everyone), or contains userId'
            $or: [
              { participantIds: { $exists: false } },
              { participantIds: this.userId },
            ],
          };
          const publicFields = Topics.publicFields.extendForUser(this.userId, community._id);
          return Topics.find(selector, { fields: publicFields });
        }
        return undefined;
      },

      // ...Related to Topics
      children: [{
        // Publish the Comments of the Topic
        find(topic) {
          return Comments.find({ topicId: topic._id }, { fields: Comments.publicFields });
        },
      }],
    }, {
      // Publish the Agendas of the Community
      find(community) {
        if (hasPermission('agendas.inCommunity')) {
          return Agendas.find({ communityId: community._id });
        }
        return undefined;
      },
    }, {
      // Publish the Delegations of the Community
      find(community) {
        if (hasPermission('delegations.inCommunity')) {
          return Delegations.find({ communityId: community._id });
        }
        return undefined;
      },
    }],
  };
}

// might be better to go with peerlibrary:meteor-reactive-publish
// https://github.com/aldeed/meteor-tabular/issues/332

// TODO: If you pass in a function instead of an object as params, it passes validation

Meteor.publishComposite('communities.byId', function communitiesById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;
  return communityPublication(this.userId, _id);
});

Meteor.publishComposite('communities.byName', function communitiesById(params) {
  new SimpleSchema({
    name: { type: String },
  }).validate(params);

  const { name } = params;
  const _id = Communities.findOne({ name })._id;
  return communityPublication(this.userId, _id);
});

// Forces that make you have MORE publications
// - you dont want too much data to be published unnecessarily (takes resource on server, and bandwith to send)
// - you can get better granularity on what the client sees at any moment

// Forces that make you have FEWER publications
// - facilitates observer reuse (when different observers subscribe to same data set, one observer can be shared on the server)
// - publications need to be permission checked, and these would get duplicated everywhere (-> more places to make errors)
// - publications need to be tested, so less tests have to be written
