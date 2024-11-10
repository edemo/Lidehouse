import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { __ } from '/imports/localization/i18n.js';
import { imageUpload } from '/imports/utils/autoform.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';
import { AttachmentField } from '/imports/api/behaviours/attachment-field.js';

import { Topics } from '/imports/api/topics/topics.js';

export const Comments = new Mongo.Collection('comments');

Comments.categoryValues = ['comment', 'statusChange', 'pointAt'];

Comments.schema = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // deprecated for creatorId
  category: { type: String, defaultValue: 'comment', allowedValues: Comments.categoryValues, autoform: { type: 'hidden' } },
  text: { type: String, max: 5000, optional: true, autoform: { type: 'markdown' } },
  // For sharding purposes, lets have a communityId in every kind of document. even if its deducible
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true },
    autoValue() {
      const topicId = this.field('topicId').value;
      if (!this.isSet && topicId) {
        const topic = Topics.findOne(topicId);
        return topic.communityId;
      }
      return undefined; // means leave whats there alone for Updates, Upserts
    },
  },
});

const StatusChanges = {};
StatusChanges.extensionSchema = new SimpleSchema({
  // for statusChange only:
  status: { type: String, optional: true, autoform: { omit: true } },
  dataUpdate: { type: Object, blackbox: true, optional: true, autoform: { omit: true } },
});

Meteor.startup(function indexComments() {
  if (Meteor.isClient && MinimongoIndexing) {
    Comments._collection._ensureIndex('topicId');
  } else if (Meteor.isServer) {
    Comments._ensureIndex({ communityId: 1, topicId: 1, createdAt: -1 });
  }
});

Comments.modifiableFields = ['text'];

Comments.attachBaseSchema(Comments.schema);
Comments.attachBehaviour(Timestamped);
Comments.attachBehaviour(Likeable);
Comments.attachBehaviour(Flagable);
Comments.attachBehaviour(AttachmentField());

Comments.attachVariantSchema(undefined, { selector: { category: 'comment' } });
Comments.attachVariantSchema(StatusChanges.extensionSchema, { selector: { category: 'statusChange' } });

Comments.helpers({
  topic() {
    return Topics.findOne(this.topicId);
  },
  community() {
    return this.topic().community();
  },
  entityName() {
    return this.category;
  },
  editableBy(userId) {
    return this.userId === userId;
  },
  hiddenBy(userId) {
    const author = this.creator();
    if (this.creatorId === userId) return undefined;
    return this.flaggedBy(userId, this.communityId) || (author && author.flaggedBy(userId, this.communityId));
  },
});

// --- Before/after actions ---

Comments.after.insert(function (userId, doc) {
  Topics.update(doc.topicId, { $inc: { commentCounter: 1 } }, { selector: { category: 'forum' } });
  if (doc.category === 'comment') {
    const topic = Topics.findOne(doc.topicId);
    if (topic.status === 'closed') {
      const setStatus = topic.finishStatus().name;
      Topics.update(doc.topicId, { $set: { status: setStatus } }, { selector: { category: 'forum' } });
      // Increasing the commentCounter touches the updatedAt field, so if you sort on that field, it will come up
    }
  }
});

Comments.after.update(function (userId, doc, fieldNames, modifier, options) {
  if (this.previous.topicId !== doc.topicId) {
    Topics.update(this.previous.topicId, { $inc: { commentCounter: -1 } });
    Topics.update(doc.topicId, { $inc: { commentCounter: 1 } });
  }
});

Comments.after.remove(function (userId, doc) {
  Topics.update(doc.topicId, { $inc: { commentCounter: -1 } });
});

Comments.moveSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  destinationId: { type: String, regEx: SimpleSchema.RegEx.Id,
    autoform: {
      options() {
        const communityId = getActiveCommunityId();
        const topics = Topics.find({ communityId, category: { $in: ['forum', 'vote', 'ticket'] } });
        return topics.map(function option(t) { return { label: t.title, value: t._id }; });
      },
      firstOption: () => __('(Select one)'),
    },
  },
});

Comments.simpleSchema({ category: 'comment' }).i18n('schemaComments');
Comments.simpleSchema({ category: 'statusChange' }).i18n('schemaStatusChanges');
Comments.moveSchema.i18n('schemaComments');

Factory.define('comment', Comments, {
  text: () => faker.lorem.sentence(),
  category: 'comment',
});
