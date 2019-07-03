import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import { Tracker } from 'meteor/tracker';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/timestamps.js';
import { FreeFields } from '/imports/api/freefields.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';

class ParcelsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const result = super.insert(doc, callback);
    this._updateCommunity(doc);
    return result;
  }
  update(selector, modifier, options, callback) {
    const originalDocs = this.find(selector);
    originalDocs.forEach((doc) => {
      this._updateCommunity(doc, -1);
    });
    const result = super.update(selector, modifier, options, callback);
    const updatedDocs = this.find(selector);
    updatedDocs.forEach((doc) => {
      this._updateCommunity(doc, 1);
    });
    return result;
  }
  remove(selector, callback) {
    const docs = this.find(selector);
    docs.forEach((doc) => {
      this._updateCommunity(doc, -1);
    });
    return super.remove(selector, callback);
  }
  _updateCommunity(doc, revertSign = 1) {
    if (!doc.type) return;
    const modifier = {}; modifier.$inc = {};
    modifier.$inc[`parcels.${doc.type}`] = revertSign;
    Communities.update(doc.communityId, modifier);
  }
}

export const Parcels = new ParcelsCollection('parcels');

Parcels.typeValues = ['flat', 'parking', 'storage', 'cellar', 'attic', 'shop', 'other'];
Parcels.heatingTypeValues = ['centralHeating', 'ownHeating'];

Parcels.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  serial: { type: Number, optional: true },
  ref: { type: String },  // unique within a community
  /* autoValue() {
        if (this.isInsert) {
          const letter = this.field('type').value.substring(0,1);
          const floor = this.field('floor').value;
          const door = this.field('door').value;
          return letter + '-' + floor + '/' + door;
        }
        return undefined; // means leave whats there alone for Updates, Upserts
      },
  */
  leadRef: { type: String, optional: true },
  units: { type: Number, optional: true },
  // TODO: move these into the House package
  type: { type: String, optional: true, allowedValues: Parcels.typeValues, autoform: autoformOptions(Parcels.typeValues) },
  building: { type: String, max: 10, optional: true },
  floor: { type: String, max: 10, optional: true },
  door: { type: String, max: 10, optional: true },
  lot: { type: String, max: 100, optional: true },
  /* autoValue() {
        if (this.isInsert) {
          return community().lot + '/A/' + serial;
        }
        return undefined; // means leave whats there alone for Updates, Upserts
      },
  */
  // cost calculation purposes
  area: { type: Number, decimal: true, optional: true },
  volume: { type: Number, decimal: true, optional: true },
  habitants: { type: Number, optional: true },
  waterMetered: { type: Boolean, optional: true },
  heatingType: { type: String, optional: true, allowedValues: Parcels.heatingTypeValues, autoform: autoformOptions(Parcels.heatingTypeValues) },
});

Meteor.startup(function indexParcels() {
  Parcels.ensureIndex({ communityId: 1, ref: 1 }, { sparse: true });
  Parcels.ensureIndex({ communityId: 1, leadRef: 1 }, { sparse: true });
  if (Meteor.isServer) {
    Parcels._ensureIndex({ lot: 1 });
  }
});

Parcels.helpers({
  isLed() {
    return this.leadRef && (this.leadRef !== this.ref);
  },
  leadParcel() {
    if (!this.leadRef || this.leadRef === this.ref) return this;
    return Tracker.nonreactive(() => Parcels.findOne({ communityId: this.communityId, ref: this.leadRef }));
  },
  leadParcelId() {
    const leadParcel = this.leadParcel();
    return leadParcel ? leadParcel._id : this._id; // if can't find your lead parcel, lead yourself
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.door ? this.door : '');
  },
  occupants() {
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, parcelId: this.leadParcelId() });
  },
  owners() {
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, parcelId: this.leadParcelId(), role: 'owner' });
  },
  representors() {
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, parcelId: this.leadParcelId(), role: 'owner', 'ownership.representor': true });
  },
  representor() {
    return this.representors().fetch()[0];
  },
  display() {
    return `${this.ref || '?'} (${this.location()}) ${__(this.type)}`;
  },
  toString() {
    return this.ref || this.location();
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  totalunits() {
    const community = this.community();
    if (!community) return undefined;
    return community.totalunits;
  },
  forEachLed(callback) {
    if (this.isLed()) return;
    const ledParcels = Parcels.find({
      communityId: this.communityId,
      $or: [{ ref: this.ref }, { leadRef: this.ref }],
    });
    ledParcels.forEach(parcel => callback(parcel));
  },
  // Voting
  ledUnits() {
    let cumulatedUnits = 0;
    this.forEachLed(parcel => cumulatedUnits += parcel.units);
    return cumulatedUnits;
  },
  share() {
    return new Fraction(this.units, this.totalunits());
  },
  ledShare() {
    return new Fraction(this.ledUnits(), this.totalunits());
  },
  ownedShare() {
    if (this.isLed()) return this.leadParcel().ownedShare();
    let total = new Fraction(0);
    Memberships.find({ parcelId: this._id, active: true, approved: true, role: 'owner' })
      .forEach(p => total = total.add(p.ownership.share));
    return total;
  },
});

Parcels.attachSchema(Parcels.schema);
// Parcels.attachSchema(FreeFields);
Parcels.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Parcels.simpleSchema().i18n('schemaParcels');
});

Factory.define('parcel', Parcels, {
  communityId: () => Factory.get('community'),
  // serial
  // ref
  // leadRef
  units: 0,
  type: 'flat',
  building: 'A',
  floor: () => faker.random.number(10).toString(),
  door: () => faker.random.number(10).toString(),
  lot: '123456/1234/1',
  area: () => faker.random.number(150),
});
