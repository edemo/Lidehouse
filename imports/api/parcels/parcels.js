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
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { FreeFields } from '/imports/api/behaviours/free-fields.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Leaderships } from '/imports/api/leaderships/leaderships';

export const Parcels = new Mongo.Collection('parcels');

Parcels.typeValues = ['flat', 'parking', 'storage', 'cellar', 'attic', 'shop', 'other'];

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
  // leadRef: { type: String, optional: true },
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
  // redundant fields:
  outstanding: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } },
});

Parcels.idSet = ['communityId', 'ref'];

Meteor.startup(function indexParcels() {
  Parcels.ensureIndex({ communityId: 1, ref: 1 }, { sparse: true });
  Parcels.ensureIndex({ communityId: 1, leadRef: 1 }, { sparse: true });
  if (Meteor.isServer) {
    Parcels._ensureIndex({ lot: 1 });
  }
});

Parcels.helpers({
  isLed() {
    const leadership = Leaderships.findOneActive({ parcelId: this._id });
    if (leadership) return true;
    return false;
  },
  leadParcelId() {
    const leadership = Leaderships.findOneActive({ parcelId: this._id });
    const leadParcelId = leadership ? leadership.leadParcelId : this._id;
    return leadParcelId; // if can't find your lead parcel, lead yourself
  },
  leadParcel() {
    return Parcels.findOne(this.leadParcelId());
  },
  leadRef() {
    const leadParcel = this.leadParcel();
    if (leadParcel && leadParcel.ref !== this.ref) return leadParcel.ref;
    return '';
  },
  followers() {
    const result = [];
    this.forEachLed(p => result.push(p));
    return result;
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.door ? this.door : '');
  },
  meters() {
    return Meters.find({ communityId: this.communityId, parcelId: this._id });
  },
  occupants() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId() });
  },
  owners() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner' });
  },
  representors() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner', 'ownership.representor': true });
  },
  representor() {
    return this.representors().fetch()[0];
  },
  payer() {
    return this.representor() || this.owners().fetch()[0];
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
    const ledParcels = Leaderships.findActive({ leadParcelId: this._id }).map(l => l.ledParcel());
    ledParcels.push(this);
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
    Memberships.findActive({ parcelId: this._id, approved: true, role: 'owner' })
      .forEach(p => total = total.add(p.ownership.share));
    return total;
  },
});

Parcels.attachSchema(Parcels.schema);
// Parcels.attachBehaviour(FreeFields);
Parcels.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Parcels.simpleSchema().i18n('schemaParcels');
});

// --- Before/after actions ---

function updateCommunity(parcel, revertSign = 1) {
  if (!parcel.type) return;
  const modifier = {}; modifier.$inc = {};
  modifier.$inc[`parcels.${parcel.type}`] = revertSign;
  Communities.update(parcel.communityId, modifier);
}

if (Meteor.isServer) {
  Parcels.after.insert(function (userId, doc) {
    updateCommunity(doc, 1);
  });

  Parcels.before.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, -1);
  });

  Parcels.after.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, 1);
  });

  Parcels.after.remove(function (userId, doc) {
    updateCommunity(doc, -1);
  });
}

// --- Factory ---

Factory.define('parcel', Parcels, {
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
