/* eslint-disable no-console */

import { Mongo } from 'meteor/mongo';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { chai } from 'meteor/practicalmeteor:chai';

import '/imports/startup/both/index.js';
// only this one needed from startup/server
import '/imports/startup/server/email-sender.js';
import '/imports/startup/server/validated-method.js';

import { initializePermissions } from '/imports/api/permissions/config.js';
import { insertUnittestFixture } from '/imports/fixture/fixtures.js';
import { defineAccountTemplates } from '/imports/api/accounting/accounts/template.js';
import { defineLocalizerTemplates } from '/imports/api/parcels/template.js';
import { defineTxdefTemplates } from '/imports/api/accounting/txdefs/template.js';
import { defineSharedFoldersTemplates } from '/imports/api/shareddocs/sharedfolders/template.js';

chai.config.truncateThreshold = Infinity;

export function logDB() {
  const collections = Mongo.Collection.getAll();
  collections.forEach((collection) => {
    console.log(collection.name, '\n', collection.instance.find().fetch());
  });
}

function initializeDatabase() {
  initializePermissions();
  defineAccountTemplates();
  defineLocalizerTemplates();
  defineTxdefTemplates();
  defineSharedFoldersTemplates();
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
