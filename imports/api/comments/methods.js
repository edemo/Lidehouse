import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';
import { Communities } from '/imports/api/communities/communities.js';
import { checkExists, checkPermissions, checkModifier } from '../method-checks';
import { updateMyLastSeen, mergeLastSeen } from '/imports/api/users/methods.js';

export const insert = new ValidatedMethod({
  name: 'comments.insert',
  validate: doc => Comments.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    doc = Comments._transform(doc);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.entityName()}.insert`, topic);
    const docId = Comments.insert(doc);
    const newDoc = Comments.findOne(docId); // we need the createdAt timestamp
    updateMyLastSeen._execute({ userId: this.userId }, { topicId: topic._id, lastSeenInfo: { timestamp: newDoc.createdAt } });
    return docId;
  },
});

export const update = new ValidatedMethod({
  name: 'comments.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Comments, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkModifier(doc, modifier, Comments.modifiableFields);
    checkPermissions(this.userId, `${doc.entityName()}.update`, doc);

    Comments.update(_id, modifier, { selector: { category: doc.category } });
  },
});

export const move = new ValidatedMethod({
  name: 'comments.move',
  validate: Comments.moveSchema.validator(),

  run({ _id, destinationId }) {
    const doc = checkExists(Comments, _id);
    checkPermissions(this.userId, 'comment.move', doc);
    if (Meteor.isServer) {
      const community = Communities.findOne(doc.communityId);
      community.users().forEach((user) => {
        mergeLastSeen(user, doc.topicId, destinationId);
      });
    }
    Comments.update(_id, { $set: { topicId: destinationId } });
  },
});

export const remove = new ValidatedMethod({
  name: 'comments.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Comments, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.entityName()}.remove`, doc);

    Comments.remove(_id);
  },
});

Comments.methods = Comments.methods || {};
_.extend(Comments.methods, { insert, update, move, remove });

//--------------------------------------------------------

const COMMENTS_METHOD_NAMES = _.pluck([insert, update, move, remove], 'name');

if (Meteor.isServer) {
  // Only allow 5 comments operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(COMMENTS_METHOD_NAMES, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
