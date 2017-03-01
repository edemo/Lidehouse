// import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from './address.js';

import { Memberships } from '/imports/api/memberships/memberships.js';

const HouseSchema = new SimpleSchema({
  lot: { type: String, max: 100, label: () => TAPi18n.__('communities.lot') },
  address: { type: AddressSchema, label: () => TAPi18n.__('communities.address') },
});

export const Communities = new Mongo.Collection('communities');

Communities.schema = new SimpleSchema({
  name: { type: String, max: 100, label: () => TAPi18n.__('communities.name') },
  profile: { type: HouseSchema, optional: true },
});

Communities.attachSchema(Communities.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Communities.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// Fields not listed here can only be seen on the server.
Communities.publicFields = {
  name: 1,
  address: 1,
};

Factory.define('community', Communities, {
  name: () => faker.lorem.sentence(),
});
