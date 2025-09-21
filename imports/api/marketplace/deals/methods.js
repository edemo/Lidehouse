import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from './deals.js';

export const initiate = new ValidatedMethod({
  name: 'deals.initiate', // create from to a Listing, by a taker
  validate: Deals.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'deals.insert', doc);
    const listing = checkExists(Listings, doc.listingId);
    doc.title = listing.title;
    doc.text = listing.text;
    doc.price = listing.price;
    doc.participantIds = [listing.creatorId, this.userId];
    doc.partner1Id = listing.creator().partnerId(doc.communityId);
    doc.partner2Id = Meteor.users.findOne(this.userId).partnerId(doc.communityId);
//    partner1Status cannot be set
//    partner2Status should be set
    doc.roomId = Topics.methods.insert._execute({ userId: this.userId }, {
      communityId: doc.communityId,
      category: 'room',
      title: 'deal chat',
      text: listing.title,
      participantIds: doc.participantIds,
      status: 'opened',
    });
    const dealId = Deals.insert(doc);
    const deal = Deals.findOne(dealId);
    const statusChangeId = Comments.insert({
      communityId: doc.communityId,
      topicId: doc.roomId,
      category: 'statusChange',
      text: doc.text,
      status: deal.dealStatus(),
      dataUpdate: { partner2Status: doc.partner2Status }
    });
    return doc.roomId;
  },
});

export const update = new ValidatedMethod({
  name: 'deals.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Deals, _id);
    checkModifier(doc, modifier, ['text', 'price']);
//    checkPermissions(this.userId, 'deals.update', doc);
    if (doc.offeringPartner().userId !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `deals.update', ${this.userId}, ${JSON.stringify(doc)}`
      );  
    }
    const result = Deals.update(_id, modifier);
    const statusChangeId = Comments.insert({
      communityId: doc.communityId,
      topicId: doc.roomId,
      category: 'statusChange',
      text: doc.text,
      status: 'proposed',
      dataUpdate: modifier.$set,
    });
    return result;
  },
});

export const confirm = new ValidatedMethod({
  name: 'deals.confirm',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Deals, _id);
    if (!_.contains(doc.participantIds, this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `${this.userId}, ${JSON.stringify(doc)}`);
    }
    if (doc.dealStatus() === 'confirmed') {
      throw new Meteor.Error('err_constraint', 'Deal already confirmed by both sides');
    }
    const user = Meteor.users.findOne(this.userId);
    const partnerId = user.partnerId(doc.communityId);
    let partnerNo, otherPartnerNo;
    if (partnerId === doc.partner1Id) { partnerNo = 'partner1'; otherPartnerNo = 'partner2'; }
    else if (partnerId === doc.partner2Id) { partnerNo = 'partner2'; otherPartnerNo = 'partner1' }
    else debugAssert(false);
    doc[`${partnerNo}Status`] = 'confirmed';
    const result = Deals.update(doc._id, { $set: { [`${partnerNo}Status`]: 'confirmed' }});
    const statusChangeId = Comments.insert({
      communityId: doc.communityId,
      topicId: doc.roomId,
      category: 'statusChange',
      text: doc.text,
      status: doc.dealStatus(),
      dataUpdate: { [`${partnerNo}Status`]: 'confirmed' },
    });
    if (doc[`${otherPartnerNo}Status`] === 'confirmed') {
      debugAssert(doc.dealStatus() === 'confirmed');
      Listings.update(doc.listingId, { $inc: { quantity: -1 } });
    }
    return result;
  },
});

export const cancel = new ValidatedMethod({
  name: 'deals.cancel',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Deals, _id);
    if (!_.contains(doc.participantIds, this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `${this.userId}, ${JSON.stringify(doc)}`);
    }
    if (doc.dealStatus() === 'confirmed') {
      throw new Meteor.Error('err_constraint', 'Deal already confirmed by both sides');
    }
    const user = Meteor.users.findOne(this.userId);
    const partnerId = user.partnerId(doc.communityId);
    let partnerNo;
    if (partnerId === doc.partner1Id) partnerNo = 'partner1'
    else if (partnerId === doc.partner2Id) partnerNo = 'partner2'
    else debugAssert(false);
    doc[`${partnerNo}Status`] = 'canceled';
    const result = Deals.update(doc._id, { $set: { [`${partnerNo}Status`]: 'canceled' }});
    const statusChangeId = Comments.insert({
      communityId: doc.communityId,
      topicId: doc.roomId,
      category: 'statusChange',
      text: doc.text,
      status: doc.dealStatus(),
      dataUpdate: { [`${partnerNo}Status`]: 'canceled' },
    });
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'deals.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Deals, _id);
    checkPermissions(this.userId, 'deals.remove', doc);
    Deals.remove(_id);
  },
});

Deals.methods = Deals.methods || {};
_.extend(Deals.methods, { initiate, update, confirm, cancel, remove });
_.extend(Deals.methods, crudBatchOps(Deals));
