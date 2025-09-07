import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { allowedOptions } from '/imports/utils/autoform.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Deals = new Mongo.Collection('deals');

Deals.statusValues = ['interested', 'confirmed', 'canceled', 'reviewed'];

Deals.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  listingId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  partner1Id: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  partner2Id: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  partner1Status: { type: String, optional: true, allowedValues: Deals.statusValues },
  partner2Status: { type: String, optional: true, allowedValues: Deals.statusValues },
  roomId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  active: { type: Boolean, defaultValue: true },
});

Meteor.startup(function indexDeals() {
  //  Deals.ensureIndex({ communityId: 1 });
  Deals.ensureIndex({ listing: 1, active: 1 });
  Deals.ensureIndex({ partner1Id: 1, partner1Status: 1 });
  Deals.ensureIndex({ partner2Id: 1, partner2Status: 1 });
});

Deals.helpers({
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
    return 'inquiry', 'preapproved', 'requested', 'confirmed', 'executed', 'reviewed';
  },
  getRoom() {
    if (this.roomId) return Topics.findOne(roomId);
    else if (this.partner1Id && this.partner2Id && Meteor.isClient()) {
      Meteor.call('topics.insert', {
        communityId: ModalStack.getVar('communityId'),
        participantIds: [this.partner1Id, this.partner2Id],
        category: 'room',
        title: this.listing().title,
        text: 'market chat',
        status: 'opened',
      }, onSuccess((res) => {
        FlowRouter.go('Room show', { _rid: res });
      }));
    }
  },
});

Deals.attachSchema(Deals.schema);
Deals.attachBehaviour(Timestamped);
Deals.simpleSchema().i18n('schemaDeals');

// --- Factory ---

Factory.define('deal', Deals, {
  partner1Status: 'interested',
  partner2Status: 'interested',
});
