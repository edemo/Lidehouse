import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Reviews } from './reviews.js';

export const insert = new ValidatedMethod({
  name: 'reviews.insert',
  validate: Reviews.simpleSchema().validator({ clean: true }),

  run(doc) {
    const deal = checkExists(Deals, doc.dealId);
    if (!_.contains(deal.participantIds, this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `${this.userId}, ${JSON.stringify(doc)}`);
    }
    if (deal.dealStatus !== 'confirmed') {
      throw new Meteor.Error('err_constraint', 'Deal needs to be confirmed before reviewing');
    }
    const user = Meteor.users.findOne(this.userId);
    const partnerId = user.partnerId(doc.communityId);
    const partnerIndex = deal.indexOf(partnerId);
    if (deal.reviewIds[partnerIndex]) {
      throw new Meteor.Error('err_constraint', 'Deal already reviewed by this party');
    } else {
      const _id = Reviews.insert(doc);
      deal.reviewIds[partnerIndex] = _id;
      Deals.update(deal._id, { $set: { reviewIds: deal.reviewIds } });
      return _id;
    }
  },
});

export const update = new ValidatedMethod({
  name: 'reviews.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Reviews, _id);
//    checkModifier(doc, modifier, ['xxx'], true);
    checkPermissions(this.userId, 'reviews.update', doc);
    Reviews.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'reviews.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Reviews, _id);
    checkPermissions(this.userId, 'reviews.remove', doc);
    Reviews.remove(_id);
  },
});

Reviews.methods = Reviews.methods || {};
_.extend(Reviews.methods, { insert, update, remove });
_.extend(Reviews.methods, crudBatchOps(Reviews));
