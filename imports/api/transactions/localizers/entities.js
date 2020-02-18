import { Meteor } from 'meteor/meteor';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Localizers } from './localizers.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Localizers.entities = {
  group: {
    name: '@group',
  },
  tag: {
    name: '#tag',
  },
};
