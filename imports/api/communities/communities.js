// import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { comtype } from '/imports/comtypes/comtype.js';

export const Communities = new Mongo.Collection('communities');

Communities.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  profile: { type: comtype.profileSchema, optional: true },
  totalshares: { type: Number },
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
  profile: 1,
  totalshares: 1,
};

Factory.define('community', Communities, {
  name: () => faker.lorem.sentence(),
});
