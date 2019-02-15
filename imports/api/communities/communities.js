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
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { ParcelBillings } from '/imports/api/journals/batches/parcel-billings.js';

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
  remove() {
    Topics.find({ communityId: this._id }).forEach(topic => topic.remove());
    Agendas.remove({ communityId: this._id });
    Parcels.remove({ communityId: this._id });
    ParcelBillings.remove({ communityId: this._id });
    Journals.remove({ communityId: this._id });
    Breakdowns.remove({ communityId: this._id });
    Memberships.remove({ communityId: this._id });
    Communities.remove({ _id: this._id });
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
