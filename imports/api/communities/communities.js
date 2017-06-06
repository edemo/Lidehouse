import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { comtype } from '/imports/comtypes/comtype.js';

export const Communities = new Mongo.Collection('communities');

Communities.schema = new SimpleSchema([
  { name: { type: String, max: 100 } },
  comtype.profileSchema,
  { totalshares: { type: Number } },
]);

Communities.attachSchema(Communities.schema);

Meteor.startup(function attach() {
  Communities.schema.i18n('api.communities');
});

// Deny all client-side updates since we will be using methods to manage this collection
Communities.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Factory.define('community', Communities, {
  name: () => faker.lorem.sentence(),
});
