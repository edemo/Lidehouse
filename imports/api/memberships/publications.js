/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Memberships } from './memberships.js';
import { Communities } from '../communities/communities.js';
import { Parcels } from '../parcels/parcels.js';

// might be better to go with peerlibrary:meteor-reactive-publish
// https://github.com/aldeed/meteor-tabular/issues/332

Meteor.publishComposite('memberships.inCommunity', function membershipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  return {
    find() {
      return Memberships.find({ communityId });
    },

    children: [
      {
        find(membership) {
          return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
        },
      }, {
        find(membership) {
          if (membership.parcelId) {
            return Parcels.find({ _id: membership.parcelId });
          }
        },
      },
    ],
  };
});

Meteor.publishComposite('memberships.ofUser', function communitiesOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;

  return {
    find() {
      return Memberships.find({ userId });
    },

    children: [{
      find(membership) {
        const communityId = membership.communityId;
       // const user = Meteor.users.findOne(this.userId);
       // const visibleFields = user.hasPermission('finances.view') ? {} : { finances: 0 };
        return Communities.find({ _id: communityId }/*, { fields: visibleFields }*/);
      },
    }],
  };
});
