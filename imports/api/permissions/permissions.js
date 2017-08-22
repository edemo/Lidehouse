import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Permissions = new Mongo.Collection('permissions');

Permissions.scopeSchema = new SimpleSchema({
  scope: { type: String, allowedValues: ['all', 'community', 'membership'] },
});

Permissions.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  type: { type: String, allowedValues: ['view', 'edit'] },
//  scope: { type: Permissions.scopeSchema },
  roles: { type: Array },
  'roles.$': { type: String },
});

Permissions.attachSchema(Permissions.schema);

// Deny all client-side updates
Permissions.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
