import { Meteor } from 'meteor/meteor';
import { Buckets } from './buckets.js';

Buckets.entities = {
  bucket: {
    name: 'bucket',
    schema: Buckets.simpleSchema(),
  },
};
