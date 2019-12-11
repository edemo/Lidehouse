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
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // deprecated for creatorId
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
    Topics._ensureIndex({ communityId: 1, category: 1, serial: 1 });
    Topics._ensureIndex({ communityId: 1, category: 1, createdAt: -1 });
    Topics._ensureIndex({ communityId: 1, participantIds: 1 });
  }
});

Topics.helpers({
  entityName() {
    return this.category;
  },
  community() {
    return Communities.findOne(this.communityId);
  },
  agenda() {
    return Agendas.findOne(this.agendaId);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
  hiddenBy(userId) {
    const author = this.creator();
    if (this.creatorId === userId) return undefined;
    return this.flaggedBy(userId, this.communityId) || (author && author.flaggedBy(userId, this.communityId));
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
  // This goes into the user's event feed
  unseenEventsBy(userId, seenType) {
    return {
      topic: this,  // need the topic, even if its already seen
      isUnseen: this.isUnseenBy(userId, seenType),
      unseenComments: this.unseenCommentListBy(userId, seenType),
      _hasThingsToDisplay: null,  // cached value
      hasUnseenThings() {
        return this.isUnseen || (this.unseenComments.length > 0);
      },
      hasThingsToDisplay() { // false if everything new with this topic is hidden for the user
        if (this._hasThingsToDisplay === null) {
          this._hasThingsToDisplay = false;
          if (this.isUnseen && !this.topic.hiddenBy(userId)) {
            this._hasThingsToDisplay = true;
          } else {
            this.unseenComments.forEach((comment) => {
              if (!comment.hiddenBy(userId)) {
                this._hasThingsToDisplay = true;
                return false;
              } else return true;
            });
          }
        }
        return this._hasThingsToDisplay;
      },
    };
  },
  // This number goes into the red badge to show you how many work to do
  needsAttention(userId, seenType = Meteor.users.SEEN_BY.EYES) {
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
        if (!this.closed && !this.hasVotedIndirect(userId)) return 1;
        break;
      case 'ticket':
        if (Meteor.user().hasPermission(`ticket.statusChangeTo.${this.status}.leave`)) return 1;
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
  modifiableFieldsByStatus() {
    return Topics.categories[this.category].statuses[this.status].data;
  },
  remove() {
    Comments.remove({ topicId: this._id });
    Topics.remove({ _id: this._id });
  },
});

Topics.topicsWithUnseenEvents = function topicsWithUnseenEvents(userId, communityId, seenType) {
  debugAssert(userId);
  debugAssert(communityId);
  debugAssert(seenType);
  return Topics.find({ communityId, closed: false,
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: userId },
    ],
  })
  .map(topic => topic.unseenEventsBy(userId, seenType))
  .filter(t => t.hasUnseenThings())
  .sort((t1, t2) => Topics.categoryValues.indexOf(t2.topic.category) - Topics.categoryValues.indexOf(t1.topic.category));
};

Topics.attachBaseSchema(Topics.baseSchema);
Topics.attachBehaviour(Timestamped);
Topics.attachBehaviour(Revisioned(['text', 'title']));
Topics.attachBehaviour(Likeable);
Topics.attachBehaviour(Flagable);
Topics.attachBehaviour(Workflow());
Topics.attachBehaviour(SerialId(['category', 'ticket.type']));

Topics.attachVariantSchema(undefined, { selector: { category: 'room' } });
Topics.attachVariantSchema(undefined, { selector: { category: 'forum' } });
Topics.attachVariantSchema(undefined, { selector: { category: 'news' } });

Meteor.startup(function attach() {
  Topics.categoryValues.forEach(category =>
    Topics.simpleSchema({ category }).i18n('schemaTopics')
  );
//  Topics.schema.i18n('schemaTopics');
});

Topics.modifiableFields = ['title', 'text', 'sticky', 'agendaId', 'photo'];
Topics.modifiableFields.push('closed'); // comes from Workflow behaviour

Topics.publicFields = {
  communityId: 1,
  category: 1,
  title: 1,
  text: 1,
  agendaId: 1,
  photo: 1,
  createdAt: 1,
  updatedAt: 1,
  creatorId: 1,
  updaterId: 1,
  opensAt: 1,
  closesAt: 1,
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
