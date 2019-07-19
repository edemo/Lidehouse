import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions, fileUpload, noUpdate } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Revisioned } from '/imports/api/behaviours/revisioned.js';
import { Workflow } from '/imports/api/behaviours/workflow.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';
import { Agendas } from '/imports/api/agendas/agendas.js';

import './category-helpers.js';

export const Topics = new Mongo.Collection('topics');

// Topic categories in order of increasing importance
Topics.categoryValues = ['feedback', 'forum', 'ticket', 'room', 'vote', 'news'];
Topics.categories = {};
Topics.categoryValues.forEach(cat => Topics.categories[cat] = {}); // Specific categories will add their own specs

Topics.extensionSchemas = {};

Topics.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  participantIds: { type: Array, optional: true, autoform: { omit: true } },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  category: { type: String, allowedValues: Topics.categoryValues, autoform: { omit: true } },
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, autoform: { rows: 8 } },
  agendaId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  photo: { type: String, optional: true, autoform: fileUpload },
  sticky: { type: Boolean, optional: true, defaultValue: false },
  commentCounter: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } },
});

Topics.idSet = ['communityId', 'category', 'serial'];

Meteor.startup(function indexTopics() {
  Topics.ensureIndex({ agendaId: 1 }, { sparse: true });
  if (Meteor.isClient && MinimongoIndexing) {
    Topics._collection._ensureIndex('category');
    Topics._collection._ensureIndex('closed');
    Topics._collection._ensureIndex(['title', 'participantIds']);
  } else if (Meteor.isServer) {
    Topics._ensureIndex({ communityId: 1, category: 1, createdAt: -1 });
  }
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
  hiddenBy(userId, communityId) {
    const author = this.createdBy();
    return this.flaggedBy(userId, communityId) || (author && author.flaggedBy(userId, communityId));
  },
  isUnseenBy(userId, seenType) {
    const user = Meteor.users.findOne(userId);
    const lastSeenInfo = user.lastSeens[seenType][this._id];
    return lastSeenInfo ? false : true;
  },
  unseenCommentsBy(userId, seenType) {
    const user = Meteor.users.findOne(userId);
    const lastSeenInfo = user.lastSeens[seenType][this._id];
    const messages = lastSeenInfo ?
       Comments.find({ topicId: this._id, createdAt: { $gt: lastSeenInfo.timestamp } }) :
       Comments.find({ topicId: this._id });
    return messages;
  },
  unseenCommentCountBy(userId, seenType) {
    return this.unseenCommentsBy(userId, seenType).count();
  },
  unseenCommentListBy(userId, seenType) {
    return this.unseenCommentsBy(userId, seenType).fetch();
  },
  unseenEventsBy(userId, seenType) {
    return 0; // TODO
  },
  needsAttention(userId, seenType) {
    if (this.participantIds && !_.contains(this.participantIds, userId)) return 0;
    switch (this.category) {
      case 'news':
        if (this.isUnseenBy(userId, seenType)) return 1;
        break;
      case 'room':
        if (this.unseenCommentCountBy(userId, seenType) > 0) return 1;
        break;
      case 'forum':
        if (this.isUnseenBy(userId, seenType) || this.unseenCommentCountBy(userId, seenType) > 0) return 1;
        break;
      case 'vote':
        if (seenType === Meteor.users.SEEN_BY.EYES
          && !this.closed && !this.hasVotedIndirect(userId)) return 1;
        if (seenType === Meteor.users.SEEN_BY.NOTI
          && (this.isUnseenBy(userId, seenType) || this.unseenCommentCountBy(userId, seenType) > 0)) return 1;
        break;
      case 'ticket':
        if (seenType === Meteor.users.SEEN_BY.EYES
          && this.status !== 'closed') return 1;
        if (seenType === Meteor.users.SEEN_BY.NOTI
          && (this.isUnseenBy(userId, seenType) || this.unseenCommentCountBy(userId, seenType) > 0)) return 1;
        break;
      case 'feedback':
        if (this.isUnseenBy(userId, seenType)) return 1;
        break;
      default:
        debugAssert(false);
    }
    return 0;
  },
  modifiableFields() {
    return Topics.modifiableFields;
  },
  remove() {
    Comments.remove({ topicId: this._id });
    Topics.remove({ _id: this._id });
  },
});

Topics.topicsNeedingAttention = function topicsNeedingAttention(userId, communityId, seenType) {
  return Topics.find({ communityId }).fetch()
    .filter(t => t.needsAttention(userId, seenType));
};

Topics.attachSchema(Topics.baseSchema);
Topics.attachBehaviour(Timestamped);
Topics.attachBehaviour(Revisioned(['text', 'title']));
Topics.attachBehaviour(Likeable);
Topics.attachBehaviour(Flagable);
Topics.attachBehaviour(Workflow());
Topics.attachBehaviour(SerialId(Topics, ['category']));
Topics.schema = new SimpleSchema(Topics.simpleSchema());


// Topics.schema is just the core schema, shared by all.
// Topics.simpleSchema() is the full schema containg timestamps plus all optional additions for the subtypes.
// Topics.schema.i18n('schemaTopics'); // sub-type of Topics will define their own translations

Meteor.startup(function attach() {
  Topics.simpleSchema().i18n('schemaTopics');
  Topics.schema.i18n('schemaTopics');
});

Topics.modifiableFields = ['title', 'text', 'sticky', 'agendaId', 'photo'];

Topics.publicFields = {
  communityId: 1,
  userId: 1,
  category: 1,
  title: 1,
  text: 1,
  agendaId: 1,
  photo: 1,
  createdAt: 1,
  closesAt: 1,
  updatedAt: 1,
  closed: 1,
  sticky: 1,
  likes: 1,
  flags: 1,
  commentCounter: 1,
  revision: 1,
  status: 1,
  serial: 1,
};

Topics.categoryValues.forEach((category) => {
  Factory.define(category, Topics, {
    category,
    serial: 0,
    title: () => `New ${(category)} about ${faker.random.word()}`,
    text: faker.lorem.paragraph(),
    status: 'opened',
  });
});
