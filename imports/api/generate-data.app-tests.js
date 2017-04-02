// This file will be auto-imported in the app-test context, ensuring the method is always available

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { denodeify } from '../utils/denodeify';

const createTopic = (userId) => {
  const topic = Factory.create('topic', { userId });
  _.times(3, () => Factory.create('comment', { topicId: topic._id }));
  return topic;
};

Meteor.methods({
  generateFixtures() {
    resetDatabase();

    // create 3 public topics
    _.times(3, () => createTopic());

    // create 3 private topics
    _.times(3, () => createTopic(Random.id()));
  },
});

if (Meteor.isClient) {
  // Create a second connection to the server to use to call test data methods
  // We do this so there's no contention w/ the currently tested user's connection
  const testConnection = Meteor.connect(Meteor.absoluteUrl());

  const generateData = denodeify((cb) => {
    testConnection.call('generateFixtures', cb);
  });

  export { generateData };
}
