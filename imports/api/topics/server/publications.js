/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

import { Topics } from '../topics.js';

Meteor.publish('topics.public', function topicsPublic() {
  return Topics.find({
    userId: { $exists: false },
  }, {
    fields: Topics.publicFields,
  });
});

Meteor.publish('topics.private', function topicsPrivate() {
  if (!this.userId) {
    return this.ready();
  }

  return Topics.find({
    userId: this.userId,
  }, {
    fields: Topics.publicFields,
  });
});
