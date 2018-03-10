import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';

import { __ } from '/imports/localization/i18n.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Roles } from '/imports/api/permissions/roles.js';
import { FreeFields } from '/imports/api/freefields.js';

export const Parcels = new Mongo.Collection('parcels');

Parcels.typeValues = ['flat', 'parking', 'storage', 'cellar', 'attic', 'shop', 'other'];
Parcels.heatingTypeValues = ['centralHeating', 'ownHeating'];

Parcels.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  serial: { type: Number, optional: true },
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
  floor: { type: String, optional: true },
  number: { type: String, optional: true },
  type: { type: String, optional: true, allowedValues: Parcels.typeValues, autoform: autoformOptions(Parcels.typeValues) },
  lot: { type: String, max: 100, optional: true },
  // cost calculation purposes
  area: { type: Number, decimal: true, optional: true },
  volume: { type: Number, decimal: true, optional: true },
  habitants: { type: Number, decimal: true, optional: true },
  waterMetered: { type: Boolean, optional: true },
  heatingType: { type: String, optional: true, allowedValues: Parcels.heatingTypeValues, autoform: autoformOptions(Parcels.heatingTypeValues) },
});

Parcels.helpers({
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
  share() {
    return new Fraction(this.units, this.totalunits());
  },
  ownedShare() {
    let total = new Fraction(0);
    Memberships.find({ parcelId: this._id, role: 'owner' }).forEach(p => total = total.add(p.ownership.share));
    return total;
  },
  representor() {
    const firstDefinedRep = Memberships.findOne({ communityId: this.communityId, parcelId: this._id, role: 'owner', 'ownership.representor': true });
    if (firstDefinedRep) return firstDefinedRep;
    const ownersSorted = Memberships.find({ communityId: this.communityId, parcelId: this._id, role: 'owner' }, { sort: { createdAt: 1 } }).fetch();
    if (ownersSorted.length > 0) return ownersSorted[0];
    const benefactorsSorted = Memberships.find({ communityId: this.communityId, parcelId: this._id, role: 'benefactor' }, { sort: { createdAt: 1 } }).fetch();
    if (benefactorsSorted.length > 0) return benefactorsSorted[0];
    return undefined;
  },
  displayNames() {
    let result = '';
    const ownerships = Memberships.find({ communityId: this.communityId, role: 'owner', parcelId: this._id });
    ownerships.forEach((m) => {
      const repBadge = m.isRepresentor() ? '(*)' : '';
      result += `${m.Person().displayName()} (${m.ownership.share.toStringLong()}) ${repBadge}<br>`;
    });
    const benefactorships = Memberships.find({ communityId: this.communityId, role: 'benefactor', parcelId: this._id });
    benefactorships.forEach((m) => {
      result += `${m.Person().displayName()}<br>`;
    });
    return result;
  },
  // TODO: move this to the house package
  location() {
    return `${this.floor}/${this.number}`;
  },
  display() {
    return `${this.serial}. ${__(this.type)} ${this.location()} (${this.lot})`;
  },
  toString() {
    return this.location();
  },
});

Parcels.attachSchema(Parcels.schema);
Parcels.attachSchema(FreeFields);
Parcels.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Parcels.simpleSchema().i18n('schemaParcels');
});

// Deny all client-side updates since we will be using methods to manage this collection
Parcels.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
