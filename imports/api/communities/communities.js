import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { comtype } from '/imports/comtypes/comtype.js';
import { displayAddress } from '/imports/localization/localization.js';
import { Timestamps } from '/imports/api/timestamps.js';

import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { fileUpload } from '/imports/utils/autoform.js';

export let getActiveCommunityId = () => {
  debugAssert(false, 'On the server you need to supply the communityId, because there is no "activeCommunity"');
};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  getActiveCommunityId = function () { return Session.get('activeCommunityId'); };
}

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = '/images/defaulthouse.jpg';

Communities.schema = new SimpleSchema([
  { name: { type: String, max: 100 } },
  { description: { type: String, max: 1200, optional: true } },
  { avatar: { type: String, defaultValue: defaultAvatar, optional: true, autoform: fileUpload } },
  comtype.profileSchema,
  { totalunits: { type: Number } },
  { management: { type: String, optional: true, autoform: { type: 'textarea' } } },
  { joinable: { type: Boolean, defaultValue: true } },
  // redundant fields:
  { parcels: { type: Object, blackbox: true, defaultValue: {}, autoform: { omit: true } } },
]);

Meteor.startup(function indexCommunities() {
  if (Meteor.isServer) {
    Communities._ensureIndex({ name: 1 });
    Communities._ensureIndex({ lot: 1 });
  }
});

Communities.publicFields = {
  totalunits: 0,
};

Communities.helpers({
  registeredUnits() {
    let total = 0;
    Parcels.find({ communityId: this._id }).forEach(p => total += p.units);
    return total;
  },
  displayAddress() {
    return displayAddress(this);
  },
  admin() {
    const adminMembership = Memberships.findOne({ communityId: this._id, active: true, role: 'admin' });
    if (!adminMembership) return undefined;
    const adminId = adminMembership.person.userId;
    return Meteor.users.findOne(adminId);
  },
  techsupport() {
    return this.admin(); // TODO: should be the person with do.techsupport permission
  },
  users() {
    const users = Memberships.find({ communityId: this._id, active: true, 'person.userId': { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
  voterships() {
    return Memberships.find({ communityId: this._id, active: true, approved: true, role: 'owner', personId: { $exists: true } })
      .fetch().filter(ownership => !ownership.isRepresentedBySomeoneElse());
  },
  voters() {
    const voters = this.voterships().map(v => v.user());
    return _.uniq(voters, false, u => u._id);
  },
  // --- writers ---
  remove() {
    const communityId = this._id;
    Communities.remove(communityId);
    Parcels.remove({ communityId });
    Memberships.remove({ communityId });
    Agendas.remove({ communityId });
    Topics.remove({ communityId });
    Comments.remove({ communityId });
    Delegations.remove({ communityId });
    Breakdowns.remove({ communityId });
    TxDefs.remove({ communityId });
    Transactions.remove({ communityId });
    Balances.remove({ communityId });
    ParcelBillings.remove({ communityId });
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Communities.simpleSchema().i18n('schemaCommunities');
});

Factory.define('community', Communities, {
  name: () => faker.random.word() + 'house',
  description: () => faker.lorem.sentence(),
  zip: () => faker.random.number({ min: 1000, max: 2000 }),
  city: () => faker.address.city(),
  street: () => faker.address.streetName(),
  number: () => faker.random.number(),
  lot: '123456/1234',
  avatar: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
  totalunits: 1000,
});
