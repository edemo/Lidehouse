import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { Listings, chooseListing } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Reviews = new Mongo.Collection('reviews');

Reviews.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  listingId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseListing, disabled: true} },
  dealId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  reviewerUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  revieweeUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  reviewerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  revieweeId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden'} },
  rating: { type: Number, decimal: true, min: 0, max: 5 },
  text: { type: String, optional: true, max: 2000,  autoform: { rows: 5 } },
});

Meteor.startup(function indexReviews() {
  Reviews.ensureIndex({ communityId: 1 });
  Reviews.ensureIndex({ reviwerId: 1 });
  Reviews.ensureIndex({ reviweeId: 1 });
  Reviews.ensureIndex({ listingId: 1 });
  Reviews.ensureIndex({ dealId: 1 });
});

Reviews.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  listing() {
    return Listings.findOne(this.listingId);
  },
  deal() {
    return Deals.findOne(this.dealId);
  },
  reviwer() {
    return Partners.findOne(this.reviwerId);
  },
  reviwee() {
    return Partners.findOne(this.reviweeId);
  },
});

Reviews.attachSchema(Reviews.schema);
Reviews.attachBehaviour(Timestamped);

Reviews.simpleSchema().i18n('schemaReviews');


// --- Factory ---

Factory.define('review', Reviews, {
  rating: '5',
  text: 'Great stuff!',
});
