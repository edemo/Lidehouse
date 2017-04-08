/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';

Meteor.publishComposite('comments.inTopic', function commentsInTopic(params) {
  new SimpleSchema({
    topicId: { type: String },
  }).validate(params);

  const { topicId } = params;
  const userId = this.userId;

  return {
    find() {
      const query = {
        _id: topicId,
        $or: [{ userId: { $exists: false } }, { userId }],
      };

      // We only need the _id field in this query, since it's only
      // used to drive the child queries to get the comments
      const options = {
        fields: { _id: 1 },
      };

      return Topics.find(query, options);
    },

    children: [{
      find(topic) {
        return Comments.find({ topicId: topic._id }, { fields: Comments.publicFields });
      },
    }],
  };
});
