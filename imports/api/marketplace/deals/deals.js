import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { modifierChangesField, autoValueUpdate } from '/imports/api/mongo-utils.js';
import { Relations } from '/imports/api/core/relations.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Reviews } from '/imports/api/marketplace/reviews/reviews.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Deals = new Mongo.Collection('deals');

Deals.statusValues = ['interested', 'confirmed', 'canceled'];

Deals.proposalSchema = new SimpleSchema({
  title: { type: String, max: 100,  optional: true },
  text: { type: String, max: 5000,  optional: true },
  price: { type: Number, optional: true },
});

Deals.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  listingId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  participantIds: { type: Array, optional: true, autoform: { omit: true } },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  partner1Id: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  partner2Id: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  partner1Status: { type: String, optional: true, allowedValues: Deals.statusValues, defaultValue: 'interested' },
  partner2Status: { type: String, optional: true, allowedValues: Deals.statusValues, defaultValue: 'interested' },
  partner1ReviewId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  partner2ReviewId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  roomId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  active: { type: Boolean, defaultValue: true },
});

Meteor.startup(function indexDeals() {
  Deals.ensureIndex({ roomId: 1, });
  Deals.ensureIndex({ listingId: 1, active: 1 });
  Deals.ensureIndex({ partner1Id: 1, partner1Status: 1 });
  Deals.ensureIndex({ partner2Id: 1, partner2Status: 1 });
  if (Meteor.isClient && MinimongoIndexing) {
    Deals._collection._ensureIndex(['participantIds']);
  } else if (Meteor.isServer) {
    Deals._ensureIndex({ communityId: 1, participantIds: 1 });
  }
});

Deals.helpers({
  partner1() {
    return Partners.findOne(this.partner1Id);
  },
  partner2() {
    return Partners.findOne(this.partner2Id);
  },
  partner1Review() {
    return this.partner1ReviewId && Reviews.findOne(this.partner1ReviewId);
  },
  partner2Review() {
    return this.partner2ReviewId && Reviews.findOne(this.partner2ReviewId);
  },
  otherPartner(user) {
    const userPartnerId = user.partnerId(this.communityId);
    if (userPartnerId === this.partner1Id) return this.partner2();
    else if (userPartnerId === this.partner2Id) return this.partner1();
    else { 
      console.log('ERROR Partners count', Partners.find({}).count());
      debugAssert(userPartnerId === undefined); 
      return undefined;
    }
  },
  otherPartnerReview(user) {
    const userPartnerId = user.partnerId(this.communityId);
    if (userPartnerId === this.partner1Id) return this.partner2Review();
    else if (userPartnerId === this.partner2Id) return this.partner1Review();
    else { debugAssert(userPartnerId === undefined); return undefined; }
  },
  community() {
    return Communities.findOne(this.communityId);
  },
  listing() {
    return Listings.findOne(this.listingId);
  },
  listingPartner() {
    return Partners.findOne(this.partner1Id);
  },
  inquiringPartner() {
    return Partners.findOne(this.partner2Id);
  },
  dealStatus() {
    // statusValues: 'inquiry', 'preapproved', 'requested', 'confirmed', 'canceled', 'executed';
    if (this.isReviewed()) return 'reviewed';
    if (this.partner1Status === 'canceled' || this.partner2Status === 'canceled') return 'canceled';
    if (this.partner1Status === 'interested') {
      if (this.partner2Status === 'interested') return 'inquiry';
      if (this.partner2Status === 'confirmed') return 'requested';
    } else if (this.partner1Status === 'confirmed') {
      if (this.partner2Status === 'interested') return 'preapproved';
      if (this.partner2Status === 'confirmed') return 'confirmed';
    }
    debugAssert(false, `No such combo: ${this.partner1Status} ${this.partner2Status}`);
  },
  isReviewed() {
    return (this.partner1ReviewId && this.partner2ReviewId);
  },
  calculateActive() {
    const status = this.dealStatus();
    return status !== 'canceled' && status !== 'reviewed';
  },
  room() {
    if (this.roomId) return Topics.findOne(this.roomId);
  },
  signOf(partner) {
    let result = 1;
    const listing = this.listing();
    if (listing.relation === 'customer') result *= -1;
    else debugAssert(listing.relation === 'supplier');
    if (partner._id === this.partner2Id) result *= -1;
    else debugAssert(partner._id === this.partner1Id);
    return result;
  },
  amountOf(partner) {
    return this.signOf(partner) * this.price;
  },
  relationOf(partner) {
    const listing = this.listing();
    let result = listing.relation;
    if (partner._id === this.partner2Id) result = Relations.opposite(result);
    else productionAssert(partner._id === this.partner1Id);
    return result;
  },
});

Deals.attachSchema(Deals.schema);
Deals.attachSchema(Deals.proposalSchema);
Deals.attachBehaviour(Timestamped);
Deals.simpleSchema().i18n('schemaDeals');

if (Meteor.isServer) {
  Deals.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    tdoc.active = tdoc.calculateActive();
  });

  Deals.before.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
    autoValueUpdate(Deals, doc, modifier, 'active', d => d.calculateActive());
  });
}


// --- Factory ---

Factory.define('deal', Deals, {
  partner1Status: 'interested',
  partner2Status: 'interested',
});
