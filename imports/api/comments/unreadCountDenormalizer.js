import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';

const unreadCountDenormalizer = {
  _updateTopic(topicId) {
    // Recalculate the correct incomplete count direct from MongoDB
    const unreadCount = Comments.find({
      topicId,
      checked: false,
    }).count();

    Topics.update(topicId, { $set: { unreadCount } });
  },
  afterInsertComment(comment) {
    this._updateTopic(comment.topicId);
  },
  afterUpdateComment(selector, modifier) {
    // We only support very limited operations on comments
    check(modifier, { $set: Object });

    // We can only deal with $set modifiers, but that's all we do in this app
    if (_.has(modifier.$set, 'checked')) {
      Comments.find(selector, { fields: { topicId: 1 } }).forEach((comment) => {
        this._updateTopic(comment.topicId);
      });
    }
  },
  // Here we need to take the topic of comments being removed, selected *before* the update
  // because otherwise we can't figure out the relevant topic id(s) (if the comment has been deleted)
  afterRemoveComments(comments) {
    comments.forEach(comment => this._updateTopic(comment.topicId));
  },
};

export default unreadCountDenormalizer;
