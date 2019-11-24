import { Meteor } from 'meteor/meteor';
import { Memberships } from './memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Memberships.entities = {
  roleship: {
    inputFields: ['role', 'person'],
    modifiableFields: ['person'],
    implicitFields: {
      communityId: () => Session.get('selectedCommunityId'),
      approved: true,
    },
  },
  ownership: {
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
    inputFields: ['person'],
    omitFields: ['person.userId'],
    implicitFields: {
      communityId: () => Session.get('selectedCommunityId'),
      role: 'delegate',
      approved: true,
    },
  },
};
