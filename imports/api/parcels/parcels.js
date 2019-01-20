import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import { Tracker } from 'meteor/tracker';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { FreeFields } from '/imports/api/freefields.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Journals } from '/imports/api/journals/journals.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';

export const Parcels = new Mongo.Collection('parcels');

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
    if (!this.communityId) return undefined;
    return Tracker.nonreactive(() => Parcels.findOne({ communityId: this.communityId, ref: this.leadRef }));
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.door ? this.door : '');
  },
  occupants() {
    if (this.isLed()) return this.leadParcel().occupants();
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, parcelId: this._id });
  },
  representors() {
    if (this.isLed()) return this.leadParcel().representors();
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, parcelId: this._id, role: 'owner', 'ownership.representor': true });
  },
  representor() {
    return this.representors().fetch()[0];
  },
  display() {
    return `${this.ref || '?'} ${__(this.type)} (${this.location()})`;
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
  // Voting
  ledUnits() {
    if (this.isLed()) return 0;
    let cumulatedUnits = this.units;
    const ledParcels = Parcels.find({ communityId: this.communityId, leadRef: this.ref });
    ledParcels.forEach((parcel) => {
      if (parcel.isLed()) { // This avoids counting twice the self-led parcel 
        cumulatedUnits += parcel.units;
      }
    });
    return cumulatedUnits;
  },
  share() {
    return new Fraction(this.units, this.totalunits());
  },
  ledShare() {
    if (this.isLed()) return new Fraction(0);
    let cumulatedShare = this.share();
    const ledParcels = Parcels.find({ communityId: this.communityId, leadRef: this.ref });
    ledParcels.forEach((parcel) => {
      if (parcel.isLed()) { // This avoids counting twice the self-led parcel 
        cumulatedShare = cumulatedShare.add(parcel.share());
      }
    });
    return cumulatedShare;
  },
  ownedShare() {
    if (this.isLed()) return this.leadParcel().ownedShare();
    let total = new Fraction(0);
    Memberships.find({ parcelId: this._id, active: true, approved: true, role: 'owner' }).forEach(p => total = total.add(p.ownership.share));
    return total;
  },
  // Finances
  balance() {
    const communityId = this.communityId;
    const journalsIn = Journals.find({ communityId, 'accountTo.Owners': { $exists: true }, 'accountTo.Localizer': this.ref });
    const journalsOut = Journals.find({ communityId, 'accountFrom.Owners': { $exists: true }, 'accountFrom.Localizer': this.ref });
    let parcelBalance = 0;
    journalsIn.forEach(p => parcelBalance += p.amount);
    journalsOut.forEach(p => parcelBalance -= p.amount);
    return parcelBalance;
  },
});

Parcels.attachSchema(Parcels.schema);
// Parcels.attachSchema(FreeFields);
Parcels.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Parcels.simpleSchema().i18n('schemaParcels');
});
