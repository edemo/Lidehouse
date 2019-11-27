import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Topics } from './topics';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Topics.entities = {
  news: {
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo', 'sticky'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'news',
    },
  },
  forum: {
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'forum',
    },
  },
};
