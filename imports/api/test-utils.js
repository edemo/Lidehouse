/* eslint-disable no-console */

import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';

import { initializePermissions } from '/imports/api/permissions/config.js';
import { insertDemoFixture } from '/imports/api/fixtures.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Roles } from '/imports/api/permissions/roles.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';

export function logDB() {
  console.log('Communities:', '\n', Communities.find().fetch());
  console.log('Users:', '\n', Meteor.users.find().fetch());
  console.log('Roles:', '\n', Roles.find().fetch());
  console.log('Permissions:', '\n', Permissions.find().fetch());
  console.log('Parcels:', '\n', Parcels.find().fetch());
  console.log('Memberships:', '\n', Memberships.find().fetch());
  console.log('Agendas:', '\n', Agendas.find().fetch());
  console.log('Topics:', '\n', Topics.find().fetch());
  console.log('PayAccounts:', '\n', PayAccounts.find().fetch());
  console.log('Payments:', '\n', Payments.find().fetch());
}

export function emptyFixture() {
  resetDatabase();
  initializePermissions();
}

export function freshFixture() {
  resetDatabase();
  initializePermissions();
  return insertDemoFixture('en');
}
