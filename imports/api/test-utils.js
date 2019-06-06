/* eslint-disable no-console */

import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { chai } from 'meteor/practicalmeteor:chai';

import { initializePermissions } from '/imports/api/permissions/config.js';
import { insertUnittestFixture } from '/imports/fixture/fixtures.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Roles } from '/imports/api/permissions/roles.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { defineBreakdownTemplates } from '/imports/api/transactions/breakdowns/template.js';
import { defineTxDefTemplates } from '/imports/api/transactions/txdefs/template.js';
import { initializeBuiltinFolders } from '/imports/api/shareddocs/sharedfolders/builtin.js';

chai.config.truncateThreshold = Infinity;

export function logDB() {
  console.log('Communities:', '\n', Communities.find().fetch());
  console.log('Users:', '\n', Meteor.users.find().fetch());
//  console.log('Roles:', '\n', Roles.find().fetch());
  console.log('Parcels:', '\n', Parcels.find().fetch());
  console.log('Memberships:', '\n', Memberships.find().fetch());
  console.log('Agendas:', '\n', Agendas.find().fetch());
  console.log('Topics:', '\n', Topics.find().fetch());
  console.log('Breakdowns:', '\n', Breakdowns.find().fetch());
  console.log('Transactions:', '\n', Transactions.find().fetch());
}

function initializeDatabase() {
  initializePermissions();
  defineBreakdownTemplates();
  defineTxDefTemplates();
  initializeBuiltinFolders();
}

export function emptyFixture() {
  resetDatabase();
  initializeDatabase();
}

export function freshFixture() {
  resetDatabase();
  initializeDatabase();
  const result = insertUnittestFixture('en');
  return result;
}
