// import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Communities = new Mongo.Collection('communities');

// Deny all client-side updates since we will be using methods to manage this collection
Communities.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Communities.schema = new SimpleSchema({
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  name: {
    type: String,
    max: 100,
  },
});

Communities.attachSchema(Communities.schema);

// This represents the keys from Community objects that should be published
// to the client. If we add secret properties to Community objects, don't list
// them here to keep them private to the server.
Communities.publicFields = {
  name: 1,
};

Factory.define('community', Communities, { name: () => faker.lorem.sentence() });
