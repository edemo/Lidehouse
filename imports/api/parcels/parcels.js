import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Roles } from '/imports/api/permissions/roles.js';

export const Parcels = new Mongo.Collection('parcels');

Parcels.helpers({
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  totalshares() {
    const community = this.community();
    if (!community) return undefined;
    return community.totalshares;
  },
  displayShareFraction() {
    if (!this.share) return '0';
    const totalshares = this.totalshares();
    if (!totalshares) return '';
    return `${this.share}/${totalshares}`;
  },
  ownerName() {
    let result = '';
    const ownerships = Memberships.find({ role: 'owner', 'ownership.parcelId': this._id });
    ownerships.forEach((m) => {
      const user = Meteor.users.findOne(m.userId);
      result += `${user.fullName()} (${m.ownership.ownedShareC}/${m.ownership.ownedShareD})<br>`;
    });
    return result;
  },
  // TODO: move this to the house package
  location() {
    return `${this.floor}/${this.number}`;
  },
  toString() {
    return this.location();
  },
});

Parcels.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  serial: { type: Number, optional: true },
  share: { type: Number, optional: true },
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
  type: { type: String, allowedValues: ['flat', 'parking', 'storage'], optional: true },
  lot: { type: String, max: 100, optional: true },
  size: { type: Number, decimal: true, optional: true },
});

Parcels.attachSchema(Parcels.schema);

Meteor.startup(function attach() {
  Parcels.simpleSchema().i18n('parcels');
});

Parcels.allow({
  insert(userId, doc) {
    return true; //hasPermission(userId, 'write.parcels');
  },
  update(userId, doc) {
    return true; //hasPermission(userId, 'write.parcels');
  },
  remove(userId, doc) {
    return true; //hasPermission(userId, 'write.parcels');
  },
});
