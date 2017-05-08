import { Mongo } from 'meteor/mongo';
import { TAPi18n } from 'meteor/tap:i18n';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Roles = new Mongo.Collection('roles');

Roles.schema = new SimpleSchema({
  name: { type: String, max: 100, label: () => TAPi18n.__('roles.name') },
});

Roles.attachSchema(Roles.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Roles.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
