import { Meteor } from 'meteor/meteor';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from './parcels';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

Parcels.entities = {
  'property': {
    name: 'property',
    category: () => getActiveCommunity().propertyCategory(),
    schema: () => Parcels.simpleSchema({ category: getActiveCommunity().propertyCategory() }),
  },
  'common': {
    name: 'common',
    category: '@common',
    schema: Parcels.simpleSchema({ category: '@common' }),
  },
  'group': {
    name: 'group',
    category: '@group',
    schema: Parcels.simpleSchema({ category: '@group' }),
  },
  'tag': {
    name: 'tag',
    category: '#tag',
    schema: Parcels.simpleSchema({ category: '#tag' }),
  },
};
