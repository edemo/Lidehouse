import { Meteor } from 'meteor/meteor';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from './parcels';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Parcels.entities = {
  '@property': {
    name: '@property',
    schema: Parcels.simpleSchema({ category: '@property' }),
  },
  '@common': {
    name: '@common',
    schema: Parcels.simpleSchema({ category: '@common' }),
  },
  '@group': {
    name: '@group',
    schema: Parcels.simpleSchema({ category: '@group' }),
  },
  '#tag': {
    name: '#tag',
    schema: Parcels.simpleSchema({ category: '#tag' }),
  },
};
