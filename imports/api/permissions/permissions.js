import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';

export const Permissions = new Mongo.Collection('permissions');

// TODO: Superadmin temp solution
// Permissions.scopeSchema = new SimpleSchema({
//   scope: { type: String, allowedValues: ['all', 'community', 'membership'] },
// });

Permissions.schema = new SimpleSchema({
  name: { type: String, max: 100 },
//  scope: { type: Permissions.scopeSchema },
  roles: { type: Array },
  'roles.$': { type: String },
  allowAuthor: { type: Boolean, optional: true },
});

Permissions.accessTypes = ['read', 'write'];

Permissions.helpers({
  accessType() {
    const methodType = this.name.split['.'].pop();
    if (['insert', 'update', 'remove'].contains(methodType)) return 'read';
    if (['listing', 'view', 'details'].contains(methodType)) return 'write';
    debugAssert(false); return '';
  },
});

Permissions.attachSchema(Permissions.schema);

// Deny all client-side updates
Permissions.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
