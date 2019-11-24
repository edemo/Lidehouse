import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Topics } from './topics';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Topics.entities = {
  news: {
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo', 'sticky'],
    modifiableFields: ['title', 'text', 'photo', 'sticky'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'news',
    },
  },
  forum: {
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo'],
    modifiableFields: ['title', 'text', 'photo'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'forum',
    },
  },
  ticket: { // Not used - Still actioned the old way
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo'],  // TODO: + data fields
    modifiableFields: ['title', 'text', 'photo'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
    },
  },
  vote: { // Not used - Still actioned the old way
    form: 'Voting_edit',
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'vote',
    },
  },
};
