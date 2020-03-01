import { Meteor } from 'meteor/meteor';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Memberships } from './memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Memberships.entities = {
  roleship: {
    name: 'roleship',
    schema: Memberships.simpleSchema({ role: 'manager' }),
    inputFields: ['role', 'rank', 'partnerId'],
    modifiableFields: ['role', 'partnerId'],
    implicitFields: {
      communityId: getActiveCommunityId,
      approved: true,
    },
  },
  ownership: {
    name: 'ownership',
    schema: Memberships.simpleSchema({ role: 'owner' }),
    inputFields: ['partnerId', 'ownership'],
    modifiableFields: ['partnerId', 'ownership'],
    implicitFields: {
      communityId: getActiveCommunityId,
      parcelId: () => Session.get('modalContext').parcelId,
      role: 'owner',
      approved: true,
    },
  },
  benefactorship: {
    name: 'benefactorship',
    schema: Memberships.simpleSchema({ role: 'benefactor' }),
    inputFields: ['partnerId', 'benefactorship'],
    modifiableFields: ['partnerId', 'benefactorship'],
    implicitFields: {
      communityId: getActiveCommunityId,
      parcelId: () => Session.get('modalContext').parcelId,
      role: 'benefactor',
      approved: true,
    },
  },
  delegate: {
    name: 'delegate',
    schema: Memberships.simpleSchema({ role: 'delegate' }),
    inputFields: ['partnerId'],
    implicitFields: {
      communityId: getActiveCommunityId,
      role: 'delegate',
      approved: true,
    },
  },
};
