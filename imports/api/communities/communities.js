// import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
// import { Factory } from 'meteor/dburles:factory';
// import faker from 'faker';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from './address.js';

export const Communities = new Mongo.Collection('communities');

// Deny all client-side updates since we will be using methods to manage this collection
Communities.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Communities.schema = new SimpleSchema({
  name: { type: String, max: 100, label: () => TAPi18n.__('communities.name') },
  lot: { type: String, max: 100, label: () => TAPi18n.__('communities.lot') },
  address: { type: AddressSchema, label: () => TAPi18n.__('communities.address') },
});

Communities.attachSchema(Communities.schema);

// Fields not listed here can only be seen on the server.
Communities.publicFields = {
  name: 1,
  address: 1,
};

// Factory.define('community', Communities, { name: () => faker.lorem.sentence() });
