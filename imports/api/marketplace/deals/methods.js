import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from './deals.js';

export const initiate = new ValidatedMethod({
  name: 'deals.initiate', // create from to a Listing, by a taker
  validate: Deals.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'deals.insert', doc);
    const listing = checkExists(Listings, doc.listingId);
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
//    checkModifier(doc, modifier, ['xxx'], true);
    checkPermissions(this.userId, 'deals.update', doc);
    Deals.update(_id, modifier);
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
_.extend(Deals.methods, { initiate, update, remove });
_.extend(Deals.methods, crudBatchOps(Deals));
