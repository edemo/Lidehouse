import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { imageUpload, documentUpload, attachmentUpload } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Revisioned } from '/imports/api/behaviours/revisioned.js';
import { Workflow } from '/imports/api/behaviours/workflow.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { AttachmentField } from '/imports/api/behaviours/attachment-field.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels, chooseLocalizer } from '/imports/api/parcels/parcels.js';
import '/imports/api/users/users.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Attachments } from '/imports/api/attachments/attachments.js';

import './category-helpers.js';

export const Topics = new Mongo.Collection('topics');

// Topic categories in order of increasing importance
Topics.categoryValues = ['feedback', 'forum', 'ticket', 'room', 'vote', 'news'];
Topics.categories = {};
Topics.categoryValues.forEach(cat => Topics.categories[cat] = {}); // Specific categories will add their own specs

Topics.extensionSchemas = {};

Topics.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // deprecated for creatorId
  participantIds: { type: Array, optional: true, autoform: { omit: true } },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  category: { type: String, allowedValues: Topics.categoryValues, autoform: { type: 'hidden' } },
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, autoform: { type: 'markdown' } },
  notiLocalizer: { type: [String], optional: true, autoform: { type: 'hidden' } }, // autoform: Parcels.choosePhysical
  commentCounter: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } },
  movedTo: { type: String, optional: true, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
});

Topics.categoryChangeSchema = new SimpleSchema({
  category: { type: String, allowedValues: Topics.categoryValues },
});

Topics.extensionSchemas.news = new SimpleSchema({
  category: { type: String, defaultValue: 'news', autoform: { type: 'hidden', defaultValue: 'news' } },
  sticky: { type: Boolean, optional: true, defaultValue: false },
});

Topics.extensionSchemas.forum = new SimpleSchema({
  category: { type: String, defaultValue: 'forum', autoform: { type: 'hidden', defaultValue: 'forum' } },
});

Topics.publicFields = {
  communityId: 1,
  category: 1,
  title: 1,
  text: 1,
  notiLocalizer: 1,
  agendaId: 1,
  createdAt: 1,
  updatedAt: 1,
  creatorId: 1,
  updaterId: 1,
  participantIds: 1,
  opensAt: 1,
  closesAt: 1,
  sticky: 1,
  likes: 1,
  flags: 1,
  commentCounter: 1,
  movedTo: 1,
  revision: 1,
  status: 1,
  serial: 1,
  serialId: 1,
};

Topics.idSet = [['communityId', 'category', 'serial']];

Meteor.startup(function indexTopics() {
  Topics.ensureIndex({ agendaId: 1 }, { sparse: true });
  Topics.ensureIndex({ communityId: 1, serial: 1 });
  Topics.ensureIndex({ communityId: 1, status: 1, category: 1 });
  if (Meteor.isClient && MinimongoIndexing) {
    Topics._collection._ensureIndex(['title', 'participantIds']);
  } else if (Meteor.isServer) {
    Topics._ensureIndex({ communityId: 1, category: 1, createdAt: -1 });
    Topics._ensureIndex({ communityId: 1, participantIds: 1, status: 1 });
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
    const Agendas = Mongo.Collection.get('agendas');
    return Agendas.findOne(this.agendaId);
  },
  comments() {
    const Comments = Mongo.Collection.get('comments');
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
  getShareddocs() {
    return Shareddocs.find({ topicId: this._id });
  },
  hasAttachment() {
    return !!this.attachments?.length;
  },
  hiddenBy(userId) {
    const author = this.creator();
    if (this.creatorId === userId) return undefined;
    return this.flaggedBy(userId, this.communityId) || (author && author.flaggedBy(userId, this.communityId));
  },
  isUnseenBy(userId, seenType) {
    const user = Meteor.users.findOne(userId);
    const lastSeenInfo = user && user.lastSeens()[seenType][this._id];
    return lastSeenInfo ? false : true;
  },
  commentsSince(timestamp) {
    const Comments = Mongo.Collection.get('comments');
    const sortByDate = { sort: { createdAt: 1 } };
    const messages = timestamp ?
      Comments.find({ topicId: this._id, createdAt: { $gt: timestamp } }, sortByDate) :
      Comments.find({ topicId: this._id }, sortByDate);
    return messages;
  },
  unseenCommentsBy(userId, seenType) {
    const user = Meteor.users.findOne(userId);
    const lastSeenTimestamp = user?.lastSeens()[seenType][this._id]?.timestamp;
    return this.commentsSince(lastSeenTimestamp);
  },
  unseenCommentCountBy(userId, seenType) {
    return this.unseenCommentsBy(userId, seenType).count();
  },
  unseenCommentListBy(userId, seenType) {
    return this.unseenCommentsBy(userId, seenType).fetch();
  },
  hasThingsToDisplayFor(userId, seenType) { // false if everything new with this topic is hidden for the user
    let result = 0;
    if (!this.hiddenBy(userId)) {
      if (this.isUnseenBy(userId, seenType)) result += 1;
      this.unseenCommentListBy(userId, seenType).forEach((comment) => {
        if (!comment.hiddenBy(userId)) result += 1;
      });
    }
    return result;
  },

  // This goes into the UI badges
  blueBadgeCount(userId = Meteor.userId(), seenType = Meteor.users.SEEN_BY.EYES) {
    debugAssert(Meteor.isClient);
    return this.hasThingsToDisplayFor(userId, seenType);
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
          this._hasThingsToDisplay = this.topic.hasThingsToDisplayFor(userId, seenType);
        }
        return this._hasThingsToDisplay;
      },
    };
  },
  isRelevantTo(userId) {
    const localizers = this.notiLocalizer || [];
    const user = Meteor.users.findOne(userId);
    if (userId === this.creatorId || user.hasPermission('ticket.statusChange', this)) return true;
    // For tickets the default noti localization is 'none', for all other categories it is 'everywhere'
    if (this.category === 'ticket') {
      if (this.ticket?.localizer) localizers.push(this.ticket.localizer);
      if (!localizers.length) return false;
    } else {
      if (!localizers.length) return true; /* notiLocalizers.push('@'); */
    }
    const parcelCodes = [];
    user.memberships(this.communityId).forEach(m => {
      const parcel = m.parcel();
      if (parcel && parcel.code) parcelCodes.push(parcel.code);
    });
    return _.any(parcelCodes, code => _.any(localizers, loc => code.startsWith(loc)));
  },
  // This number goes into the red badge to show you how many work to do
  needsAttention(userId, seenType = Meteor.users.SEEN_BY.EYES) {
    if (this.participantIds && !_.contains(this.participantIds, userId)) return 0;
    const user = Meteor.users.findOne(userId);
    const partnerId = user.partnerId(this.communityId);
    switch (this.category) {
// These guys have been separated into the info badge
//      case 'news':
//        if (this.isUnseenBy(userId, seenType)) return 1;
//        break;
//      case 'room':
//        if (this.unseenCommentCountBy(userId, seenType) > 0) return 1;
//        break;
//      case 'forum':
//        if (this.isUnseenBy(userId, seenType) || this.unseenCommentCountBy(userId, seenType) > 0) return 1;
//        break;
      case 'vote':
        if (!this.votingClosed() && !this.hasVoted(partnerId) && user.totalVotingPower(this.communityId) > 0) return 1;
        break;
      case 'ticket':
        if (!_.contains(['finished', 'closed', 'deleted'], this.status) && Meteor.user().hasPermission(`ticket.statusChange.${this.status}.leave`, this)) return 1;
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
    const Comments = Mongo.Collection.get('comments');
    Comments.remove({ topicId: this._id });
    Topics.remove({ _id: this._id });
  },
});

Topics.topicsWithUnseenEvents = function topicsWithUnseenEvents(userId, communityId, seenType) {
  debugAssert(userId);
  debugAssert(communityId);
  debugAssert(seenType);
  return Topics.find({ communityId, status: { $ne: 'closed' },
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: userId },
    ],
  }).fetch()
    .filter(t => t.isRelevantTo(userId))
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
Topics.attachBehaviour(AttachmentField());

Topics.attachVariantSchema(undefined, { selector: { category: 'room' } });
Topics.attachVariantSchema(Topics.extensionSchemas.forum, { selector: { category: 'forum' } });
Topics.attachVariantSchema(Topics.extensionSchemas.news, { selector: { category: 'news' } });

Topics.categoryValues.forEach(category => {
  Topics.simpleSchema({ category }).i18n('schemaTopics');
});
//  Topics.schema.i18n('schemaTopics');

Topics.modifiableFields = ['title', 'text', 'sticky', 'agendaId', 'notiLocalizer'];

Topics.categoryValues.forEach((category) => {
  Factory.define(category, Topics, {
    category,
    serial: 0,
    title: () => `New ${(category)} about ${faker.random.word()}`,
    text: faker.lorem.paragraph(),
    status: 'opened',
  });
});
