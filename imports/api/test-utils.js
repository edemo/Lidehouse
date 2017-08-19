import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { initializePermissions } from '/imports/api/permissions/config.js';
import { insertDemoFixture } from '/imports/api/fixtures.js';

import '/imports/api/memberships/publications.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Roles } from '/imports/api/permissions/roles.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';

export function logDB() {
  console.log('Communities:', '\n', Communities.find().fetch());
  console.log('Users:', '\n', Meteor.users.find().fetch());
  console.log('Roles:', '\n', Roles.find().fetch());
  console.log('Permissions:', '\n', Permissions.find().fetch());
  console.log('Parcels:', '\n', Parcels.find().fetch());
  console.log('Memberships:', '\n', Memberships.find().fetch());
  console.log('Topics:', '\n', Topics.find().fetch());
}

export function freshFixture() {
  resetDatabase();
  initializePermissions();
  return insertDemoFixture();
}
