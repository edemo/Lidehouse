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
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Deals = new Mongo.Collection('deals');

Deals.partnerStatusValues = ['interested', 'proposed', 'confirmed', 'canceled'];
Deals.dealStatusValues = ['interested', 'inquiry', 'requested', 'offered', 'preapproved', 'proposed', 'confirmed', 'canceled', 'reviewed'];

Deals.detailsSchema = new SimpleSchema({
  title: { type: String, max: 100,  optional: true, autoform: { readonly: true } },
  text: { type: String, max: 2000,  optional: true, autoform: { rows: 6, readonly: true } },
  uom: { type: String, max: 25, optional: true, autoform: { readonly: true } },
  quantity: { type: Number, optional: true,  autoform: { readonly: true } },
  price: { type: Number, optional: true, autoform: { readonly: true } },
});

Deals.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  listingId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  participantIds: { type: Array, optional: true, autoform: { omit: true } },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  partnerIds: { type: Array, optional: true, autoform: { omit: true } },
  'partnerIds.$': { type: String, regEx: SimpleSchema.RegEx.Id }, // [0] is the listing partner, and [1] is the taking partner
  partnerStatuses: { type: Array, optional: true, defaultValue: ['interested', 'interested'], autoform: { type: 'hidden' } },
  'partnerStatuses.$': { type: String, allowedValues: Deals.partnerStatusValues },
  dealStatus: { type: String, allowedValues: Deals.dealStatusValues, defaultValue: 'interested' },
  reviewIds: { type: Array, optional: true, defaultValue: [], autoform: { type: 'hidden' } },
  'reviewIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },
  roomId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  active: { type: Boolean, defaultValue: true },
});

Meteor.startup(function indexDeals() {
  Deals.ensureIndex({ roomId: 1 });
  Deals.ensureIndex({ listingId: 1, active: 1 });
  Deals.ensureIndex({ partnerIds: 1, active: 1 });
  if (Meteor.isClient && MinimongoIndexing) {
    Deals._collection._ensureIndex(['participantIds']);
  } else if (Meteor.isServer) {
    Deals._ensureIndex({ communityId: 1, participantIds: 1 });
  }
});

Deals.helpers({
  listing() {
    return Listings.findOne(this.listingId);
  },
  room() {
    return this.roomId && Topics.findOne(this.roomId);
  },
  listingPartnerId() {
    return this.partnerIds[0];
  },
  listingPartner() {
    return Partners.findOne(this.partnerIds[0]);
  },
  initiatingPartnerId() {
    return this.partnerIds[1];
  },
  initiatingPartner() {
    return Partners.findOne(this.partnerIds[1]);
  },
  otherPartner(partnerId) {
    const i = this.indexOf(partnerId);
    const otherPartnerId = this.partnerIds[1 - i];
    return Partners.findOne(otherPartnerId);
  },
  otherPartnerReview(partnerId) {
    const i = this.indexOf(partnerId);
    const otherReviewId = this.reviewIds[1 - i];
    const Reviews = Mongo.Collection.get('reviews');
    return otherReviewId && Reviews.findOne(otherReviewId);
  },
  partnerIndex(relation) {
    const listingRelation = this.listing().relation;
    if (listingRelation === 'supplier') return relation === 'supplier' ? 0 : 1;
    else if (listingRelation === 'customer') return relation === 'customer' ? 0 : 1;
    else { debugAssert(false); return undefined; }
  },
  supplierPartnerId() {
    const i = this.partnerIndex('supplier');
    return this.partnerIds[i];
  },
  supplierPartner() {
    const partnerId = this.supplierPartnerId();
    return partnerId && Partners.findOne(partnerId);
  },
  customerPartnerId() {
    const i = this.partnerIndex('customer');
    return this.partnerIds[i];
  },
  customerPartner() {
    const partnerId = this.customerPartnerId();
    return partnerId && Partners.findOne(partnerId);
  },
  isConfirmedAlready() {
    return Deals.dealStatusValues.indexOf(this.dealStatus) >= Deals.dealStatusValues.indexOf('confirmed');
  },
  isReviewed() {
    return (this.reviewIds[0] && this.reviewIds[1]);
  },
  calculateDealStatus() {
    // statusValues: 'inquiry', 'preapproved', 'requested', 'confirmed', 'canceled', 'executed';
    if (this.isReviewed()) return 'reviewed';
    if (this.partnerStatuses[0] === 'canceled' || this.partnerStatuses[1] === 'canceled') return 'canceled';
    const s = this.partnerIndex('supplier');
    const c = 1 - s;
    if (this.partnerStatuses[s] === 'proposed') {
      if (this.partnerStatuses[c] === 'interested') return 'proposed';
      if (this.partnerStatuses[c] === 'confirmed') return 'confirmed';
    }
    if (this.partnerStatuses[0] === 'interested') {
      if (this.partnerStatuses[1] === 'interested') return 'inquiry';
      if (this.partnerStatuses[1] === 'confirmed') return this.listing().relation === 'supplier' ? 'requested' : 'offered';
    } else if (this.partnerStatuses[0] === 'confirmed') {
      if (this.partnerStatuses[1] === 'interested') return 'preapproved';
      if (this.partnerStatuses[1] === 'confirmed') return 'confirmed';
    }
    debugAssert(false, `No such combo: ${this.partnerStatuses}`); return undefined;
  },
  calculateActive() {
    const status = this.calculateDealStatus();
    return status !== 'canceled' && status !== 'reviewed';
  },
  indexOf(partnerId) {
    if (partnerId === this.partnerIds[0]) return 0;
    else if (partnerId === this.partnerIds[1]) return 1;
    else { debugAssert(false); return undefined; }
  },
  relationOf(partnerId) {
    const listingRelation = this.listing().relation;
    if (this.indexOf(partnerId) === 0) return listingRelation;
    else if (this.indexOf(partnerId) === 1) return Relations.opposite(listingRelation);
    else { debugAssert(false); return undefined; }
  },
  signOf(partnerId) {
    if (this.relationOf(partnerId) === 'supplier') return 1;
    else if (this.relationOf(partnerId) === 'customer') return -1;
    else { debugAssert(false); return undefined; }
  },
  amountOf(partnerId) {
    return this.signOf(partnerId) * this.price;
  },
});

Deals.attachSchema(Deals.schema);
Deals.attachSchema(Deals.detailsSchema);
Deals.attachBehaviour(Timestamped);
Deals.simpleSchema().i18n('schemaDeals');

Deals.detailsSchema.i18n('schemaDeals');

Deals.initiateSchema = new SimpleSchema(Deals.simpleSchema());
Deals.initiateSchema._schema.quantity.autoform = { readonly: false };
Deals.confirmSchema = new SimpleSchema(Deals.simpleSchema());
Deals.proposeSchema = new SimpleSchema(Deals.simpleSchema());
Deals.proposeSchema._schema.text.autoform = { rows: 6, readonly: false };
Deals.proposeSchema._schema.quantity.autoform = { readonly: false };
Deals.proposeSchema._schema.price.autoform = { readonly: false };

if (Meteor.isServer) {
  Deals.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    doc.active = tdoc.calculateActive();
    doc.dealStatus = tdoc.calculateDealStatus();
  });

  Deals.before.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
    autoValueUpdate(Deals, doc, modifier, 'active', d => d.calculateActive());
    autoValueUpdate(Deals, doc, modifier, 'dealStatus', d => d.calculateDealStatus());
  });

  Deals.after.update(function (userId, doc, fieldNames, modifier, options) {
    const newDoc = Deals._transform(doc);
    const oldDoc = Deals._transform(this.previous);
    if (oldDoc.dealStatus !== 'confirmed' && doc.dealStatus === 'confirmed' && newDoc.listing().available) {
      Listings.update(doc.listingId, { $inc: { available: -1 * (doc.quantity || 1) } });
    }
  });
}

// --- Factory ---

Factory.define('deal', Deals, {
  partnerStatuses: ['interested', 'interested'],
});
