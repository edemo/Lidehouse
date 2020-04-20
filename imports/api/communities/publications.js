/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Memberships } from '/imports/api/memberships/memberships';
import { Communities } from './communities.js';

// This publication sends only very basic data about what communities exist on this server
Meteor.publishComposite('communities.listing', function communitiesListing() {
  return {
    find() {
      return Communities.find({}, { fields: Communities.listingsFields });
    },
    children: [{
      find(community) {
        return Memberships.findActive({ communityId: community._id, role: { $in: leaderRoles } });
      },
      children: [{
        find(membership) {
          return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }],
  };
});

// This publication gives detailed data about a specific community
function communityPublication(userId, _id) {
  return {
    find() {
      return Communities.find({ _id });
    },
    children: [{
      find(community) {
        return Memberships.findActive({ communityId: community._id, role: { $in: leaderRoles } });
      },
      children: [{
        find(membership) {
          return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
        },
      }],
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
