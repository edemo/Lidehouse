import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { Relations } from '/imports/api/core/relations.js';
import { Buckets, chooseBucket } from '/imports/api/marketplace/buckets/buckets.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { AttachmentField } from '/imports/api/behaviours/attachment-field.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';

export const Listings = new Mongo.Collection('listings');

Listings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  relation: { type: String, allowedValues: Relations.mainValues, autoform: _.extend({}, allowedOptions, { value: () => ModalStack.getVar('relation') }) },
  title: { type: String, max: 100 },
  text: { type: String, max: 5000, autoform: { type: 'markdown' } },
  location: { type: String, max: 100, optional: true },
  delivery: { type: [String], max: 100, optional: true, autoform: { type: 'select-checkbox' } },
  bucket: { type: String, max: 500, autoform: { ...chooseBucket } },
  keywords: { type: String, max: 1000, optional: true },
  price: { type: Number, optional: true },
  uom: { type: String, max: 25, optional: true },
  quantity: { type: Number, optional: true },
});

Meteor.startup(function indexListings() {
  Listings.ensureIndex({ communityId: 1, bucket: 1 });
  Listings.ensureIndex({ communityId: 1, location: 1 });
  Listings.ensureIndex({ creatorId: 1 });
  Listings.ensureIndex({ likes: 1 });
});

Listings.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  activeDeals() {
    const Deals = Mongo.Collection.get('deals');
    return Deals.find({ listingId: this._id, active: true });
  },
});

Listings.attachSchema(Listings.schema);
Listings.attachBehaviour(Timestamped);
Listings.attachBehaviour(AttachmentField());
Listings.attachBehaviour(Likeable);
Listings.attachBehaviour(Flagable);

Listings.simpleSchema().i18n('schemaListings');

// -----------------

export const chooseListing = {
  options() {
    return Listings.find({}).map(function option(v) {
      return { label: v.title, value: v._id };
    });
  },
  firstOption: () => __('(Select one)'),
};

// --- Factory ---

Factory.define('listing', Listings, {
  side: 'offer',
});
