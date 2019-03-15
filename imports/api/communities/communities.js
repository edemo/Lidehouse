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
  { avatar: { type: String, /* regEx: SimpleSchema.RegEx.Url,*/ defaultValue: defaultAvatar } },
  comtype.profileSchema,
  { totalunits: { type: Number } },
  // redundant fields:
  { parcels: { type: Object, blackbox: true, defaultValue: {} } },
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
  name: () => faker.lorem.sentence(),
  totalunits: 10000,
});
