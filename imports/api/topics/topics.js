import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { Timestamps } from '/imports/api/timestamps.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';
import { Agendas } from '/imports/api/agendas/agendas.js';

class TopicsCollection extends Mongo.Collection {
  insert(topic, callback) {
    return super.insert(topic, callback);
  }
  remove(selector, callback) {
    Comments.remove({ topicId: selector });
    return super.remove(selector, callback);
  }
}

export const Topics = new TopicsCollection('topics');

Topics.categoryValues = ['forum', 'vote', 'news', 'ticket', 'room', 'feedback'];

Topics.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  participantIds: { type: Array, optional: true, autoform: { omit: true } },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  category: { type: String, allowedValues: Topics.categoryValues, autoform: { omit: true } },
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, optional: true },
  agendaId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  closed: { type: Boolean, optional: true, defaultValue: false, autoform: { omit: true } },
  sticky: { type: Boolean, optional: true, defaultValue: false },
  likes: { type: Array, defaultValue: [], autoform: { omit: true } },
  'likes.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  commentCounter: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } }, // removals DON'T decrease it (!)
});

Topics.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  agenda() {
    return Agendas.findOne(this.agendaId);
  },
  createdBy() {
    return Meteor.users.findOne(this.userId);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
  isUnseenBy(userId) {
    const user = Meteor.users.findOne(userId);
    const lastSeenInfo = user.lastseens[this._id];
    return lastSeenInfo ? false : true;
  },
  unseenCommentsBy(userId) {
    const user = Meteor.users.findOne(userId);
/*    const lastseenTimestamp = user.lastseens[this._id];
    const messages = lastseenTimestamp ?
       Comments.find({ topicId: this._id, createdAt: { $gt: lastseenTimestamp } }) :
       Comments.find({ topicId: this._id });
    return messages.count();
    */
    const lastSeenInfo = user.lastseens[this._id];
    const lastSeenCommentCounter = lastSeenInfo ? lastSeenInfo.commentCounter : 0;
    const newCommentCounter = this.commentCounter - lastSeenCommentCounter;
    return newCommentCounter;
  },
  remove() {
    Comments.remove({ topicId: this._id });
    Topics.remove({ _id: this._id });
  },
});

export const likesHelpers = {
  isLikedBy(userId) {
    return _.contains(this.likes, userId);
  },
  likesCount() {
    return this.likes.length;
  },
  /* To update, you need to call the 'like' meteormethod
  toggleLike(userId) {
    const index = _.indexOf(this.likes, userId);
    if (index >= 0) this.likes.splice(index, 1);
    else this.likes.push(userId);
  },*/
};
Topics.helpers(likesHelpers);

Topics.attachSchema(Topics.schema);
Topics.attachSchema(Timestamps);

Meteor.startup(function attach() {
  // Topics.schema is just the core schema, shared by all.
  // Topics.simpleSchema() is the full schema containg timestamps plus all optional additions for the subtypes.
  // Topics.schema.i18n('schemaTopics'); // sub-type of Topics will define their own translations
  Topics.simpleSchema().i18n('schemaTopics');
  Topics.schema.i18n('schemaTopics');
});

// Deny all client-side updates since we will be using methods to manage this collection
Topics.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// This represents the keys from Topics objects that should be published to the client.
// If we add secret properties to Topic objects, don't list them here to keep them private to the server.
Topics.publicFields = {
  communityId: 1,
  userId: 1,
  category: 1,
  title: 1,
  text: 1,
  agendaId: 1,
  createdAt: 1,
  closed: 1,
  sticky: 1,
  likes: 1,
  commentCounter: 1,
};

Factory.define('topic', Topics, {
  communityId: () => Factory.get('community'),
});
