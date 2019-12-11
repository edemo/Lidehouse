import { Meteor } from 'meteor/meteor';
import { Memberships } from './memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Memberships.entities = {
  roleship: {
    name: 'roleship',
    schema: Memberships.simpleSchema({ role: 'manager' }),
    inputFields: ['role', 'person'],
    modifiableFields: ['person'],
    implicitFields: {
      communityId: () => Session.get('selectedCommunityId'),
      approved: true,
    },
  },
  ownership: {
    name: 'ownership',
    schema: Memberships.simpleSchema({ role: 'owner' }),
    inputFields: ['person', 'ownership'],
    modifiableFields: ['person', 'ownership'],
    implicitFields: {
      communityId: () => Session.get('selectedCommunityId'),
      parcelId: () => Session.get('selectedParcelId'),
      role: 'owner',
      approved: true,
    },
  },
  benefactorship: {
    name: 'benefactorship',
    schema: Memberships.simpleSchema({ role: 'benefactor' }),
    inputFields: ['person', 'benefactorship'],
    modifiableFields: ['person', 'benefactorship'],
    implicitFields: {
      communityId: () => Session.get('selectedCommunityId'),
      parcelId: () => Session.get('selectedParcelId'),
      role: 'benefactor',
      approved: true,
    },
  },
  delegate: {
    name: 'delegate',
    schema: Memberships.simpleSchema({ role: 'delegate' }),
    inputFields: ['person'],
    omitFields: ['person.userId'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      role: 'delegate',
      approved: true,
    },
  },
};
