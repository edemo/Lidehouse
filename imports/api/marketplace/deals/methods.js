import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from './deals.js';

export const initiate = new ValidatedMethod({
  name: 'deals.initiate', // create from a Listing, by a taker
  validate: Deals.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'deals.insert', doc);
    const listing = checkExists(Listings, doc.listingId);
    doc.title = listing.title;
    doc.text = listing.text;
    doc.uom = listing.uom;
    doc.quantity = doc.quantity || 1;
    doc.price = listing.price && (doc.quantity * listing.price);
    doc.participantIds = [listing.creatorId, this.userId];
    doc.partnerIds = [listing.creator().partnerId(doc.communityId),
      Meteor.users.findOne(this.userId).partnerId(doc.communityId),
    ];
    productionAssert(doc.partnerStatuses[0] === 'interested');
    productionAssert(doc.partnerStatuses[1] === 'interested' || doc.partnerStatuses[1] === 'confirmed');

    doc.roomId = Topics.methods.insert._execute({ userId: this.userId }, {
      communityId: doc.communityId,
      category: 'room',
      title: 'deal chat',
      text: listing.title,
      participantIds: doc.participantIds,
      status: 'opened',
    });
    const dealId = Deals.insert(doc);
    const updatedDoc = Deals.findOne(dealId);

    const dataUpdate = { partnerStatuses: doc.partnerStatuses };
    if (doc.partnerStatuses[1] === 'confirmed') {
      dataUpdate.text = doc.text;
      dataUpdate.uom = doc.uom;
      dataUpdate.quantity = doc.quantity;
      dataUpdate.price = doc.price;
    }
    const statusChangeId = Comments.insert({
      communityId: doc.communityId,
      topicId: doc.roomId,
      category: 'statusChange',
      text: '',
      status: updatedDoc.calculateDealStatus(),
      dataUpdate,
    });

    return doc.roomId;
  },
});

function statusChange(doc, user, modifier, partnerStatus, otherPartnerStatus) { 
  // If otherPartnberStatus is not specified, then it will be unmodified
  const partnerId = user.partnerId(doc.communityId);
  const partnerIndex = doc.indexOf(partnerId);
  modifier.$set.partnerStatuses[partnerIndex] = partnerStatus;
  modifier.$set.partnerStatuses[1 - partnerIndex] = otherPartnerStatus || doc.partnerStatuses[1 - partnerIndex];
  const result = Deals.update(doc._id, modifier);
  const updatedDoc = Deals.findOne(doc._id);
  const statusChangeId = Comments.insert({
    communityId: doc.communityId,
    topicId: doc.roomId,
    category: 'statusChange',
    text: '',
    status: updatedDoc.calculateDealStatus(),
    dataUpdate: modifier.$set,
  });
  return result;
}

export const propose = new ValidatedMethod({
  name: 'deals.propose',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Deals, _id);
    checkModifier(doc, modifier, ['text', 'quantity', 'price', 'partnerStatuses']);
//    checkPermissions(this.userId, 'deals.propose', doc);
    if (doc.supplierPartner().userId !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `deals.propose', ${this.userId}, ${JSON.stringify(doc)}`
      );
    }
    const user = Meteor.users.findOne(this.userId);
    return statusChange(doc, user, modifier, 'proposed', 'interested');
  },
});

export const confirm = new ValidatedMethod({
  name: 'deals.confirm',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Deals, _id);
    checkModifier(doc, modifier, ['partnerStatuses']);
    if (!_.contains(doc.participantIds, this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `${this.userId}, ${JSON.stringify(doc)}`);
    }
    if (doc.isConfirmedAlready()) {
      throw new Meteor.Error('err_constraint', 'Deal already confirmed by both sides');
    }
    const user = Meteor.users.findOne(this.userId);
    return statusChange(doc, user, modifier, 'confirmed');
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
    if (doc.isConfirmedAlready()) {
      throw new Meteor.Error('err_constraint', 'Deal already confirmed by both sides');
    }
    const user = Meteor.users.findOne(this.userId);
    const partnerStatuses = doc.partnerStatuses;
    const modifier = { $set: { partnerStatuses } };
    return statusChange(doc, user, modifier, 'canceled');
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
_.extend(Deals.methods, { initiate, propose, confirm, cancel, remove });
//_.extend(Deals.methods, crudBatchOps(Deals));
