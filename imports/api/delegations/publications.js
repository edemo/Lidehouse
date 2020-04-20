/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Partners } from '/imports/api/partners/partners.js';
import { Delegations } from './delegations.js';

Meteor.publish('delegations.inCommunity', function delegationsOfCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('delegations.inCommunity', { communityId })) return this.ready();
  return Delegations.find({ communityId });
});

Meteor.publishComposite('delegations.fromUser', function delegationsFromUser(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOne(this.userId);
  if (!user || !user.partnerId(communityId)) {
    return this.ready();
  }

// Everyone has access to all of his own stuff automatically
  return {
    find() {
      return Delegations.find({ sourceId: user.partnerId(communityId) });
    },
    // Publish the Target User of the Delegation
    children: [{
      find(delegation) {
        return Partners.find({ _id: delegation.targetId }, { fields: Partners.publicFields });
      },
      children: [{
        find(partner) {
          return Meteor.users.find({ _id: partner.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }],
  };
});

Meteor.publishComposite('delegations.toUser', function delegationsToUser(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOne(this.userId);
  if (!user || !user.partnerId(communityId)) {
    return this.ready();
  }

  return {
    find() {
      return Delegations.find({ targetId: user.partnerId(communityId) });
    },
    // Publish the Source User of the Delegation
    children: [{
      find(delegation) {
        return Partners.find({ _id: delegation.sourceId }, { fields: Partners.publicFields });
      },
      children: [{
        find(partner) {
          return Meteor.users.find({ _id: partner.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }],
  };
});
