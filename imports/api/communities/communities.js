import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { comtype } from '/imports/comtypes/comtype.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = 'http://clipart-library.com/image_gallery/215485.png';

Communities.schema = new SimpleSchema([
  { name: { type: String, max: 100 } },
  { description: { type: String, max: 1200, optional: true } },
  { avatar: { type: String, regEx: SimpleSchema.RegEx.Url, defaultValue: defaultAvatar } },
  comtype.profileSchema,
  { totalunits: { type: Number } },
]);

Communities.helpers({
  registeredUnits() {
    let total = 0;
    Parcels.find({ communityId: this._id }).forEach(p => total += p.units);
    return total;
  },
  admin() {
    return Memberships.findOne({ communityId: this._id, role: 'admin' });
  },
  users() {
    const users = Memberships.find({ communityId: this._id, userId: { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Communities.simpleSchema().i18n('schemaCommunities');
});

// Deny all client-side updates since we will be using methods to manage this collection
Communities.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Factory.define('community', Communities, {
  name: () => faker.lorem.sentence(),
  totalunits: 10000,
});
