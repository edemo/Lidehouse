import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { allowedOptions } from '/imports/utils/autoform.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Reviews = new Mongo.Collection('reviews');

Reviews.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  listingId: { type: String, regEx: SimpleSchema.RegEx.Id },
  dealId: { type: String, regEx: SimpleSchema.RegEx.Id },
  reviwerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
  reviweeId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
  rating: { type: Number, decimal: true },
  text: { type: String, max: 5000, autoform: { type: 'markdown' } },
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

Factory.define('listing', Listings, {
  rating: '5',
  text: 'Great',
});
