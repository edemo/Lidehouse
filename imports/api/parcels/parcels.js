import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';

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
  serial: { type: String, optional: true },
  leadSerial: { type: String, optional: true },
  units: { type: Number, optional: true },
  /*  name: { type: String,
      autoValue() {
        if (this.isInsert) {
          const letter = this.field('type').value.substring(0,1);
          const floor = this.field('floor').value;
          const number = this.field('number').value;
          return letter + '-' + floor + '/' + number;
        }
        return undefined; // means leave whats there alone for Updates, Upserts
      },
    },
  */
  // TODO: move these into the House package
  building: { type: String, max: 10, optional: true },
  floor: { type: String, max: 10, optional: true },
  number: { type: String, max: 10, optional: true },
  type: { type: String, optional: true, allowedValues: Parcels.typeValues, autoform: autoformOptions(Parcels.typeValues) },
  lot: { type: String, max: 100, optional: true },
  // cost calculation purposes
  area: { type: Number, decimal: true, optional: true },
  volume: { type: Number, decimal: true, optional: true },
  habitants: { type: Number, optional: true },
  waterMetered: { type: Boolean, optional: true },
  heatingType: { type: String, optional: true, allowedValues: Parcels.heatingTypeValues, autoform: autoformOptions(Parcels.heatingTypeValues) },
});

Parcels.helpers({
  leadParcel() {
    if (!this.leadSerial || this.leadSerial === this.serial) return this;
    return Parcels.findOne({ serial: this.leadSerial });
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.number ? this.number : '');
  },
  occupants() {
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, role: { $in: ['owner', 'benefactor'] }, parcelId: this._id });
  },
  representors() {
    return Memberships.find({ communityId: this.communityId, active: true, approved: true, role: 'owner', parcelId: this._id, 'ownership.representor': true });
  },
  display() {
    return `${this.serial || '?'}. ${__(this.type)} ${this.location()} (${this.lot})`;
  },
  toString() {
    return this.serial || this.location();
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
  share() {
    return new Fraction(this.units, this.totalunits());
  },
  ownedShare() {
    let total = new Fraction(0);
    Memberships.find({ parcelId: this._id, active: true, approved: true, role: 'owner' }).forEach(p => total = total.add(p.ownership.share));
    return total;
  },
  // Finances
  balance() {
    const communityId = this.communityId;
    const journalsIn = Journals.find({ communityId, 'accountTo.Owners': { $exists: true }, 'accountTo.Localizer': this.serial.toString() });
    const journalsOut = Journals.find({ communityId, 'accountFrom.Owners': { $exists: true }, 'accountFrom.Localizer': this.serial.toString() });
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
