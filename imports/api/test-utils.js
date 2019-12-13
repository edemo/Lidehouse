/* eslint-disable no-console */

import { Mongo } from 'meteor/mongo';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { chai } from 'meteor/practicalmeteor:chai';

import '/imports/startup/both/index.js';
import '/imports/startup/server/validated-method.js'; // only this one needed from startup/server

import { initializePermissions } from '/imports/api/permissions/config.js';
import { insertUnittestFixture } from '/imports/fixture/fixtures.js';
import { defineBreakdownTemplates } from '/imports/api/transactions/breakdowns/template.js';
import { defineTxCatTemplates } from '/imports/api/transactions/tx-cats/template.js';
import { initializeBuiltinFolders } from '/imports/api/shareddocs/sharedfolders/builtin.js';

chai.config.truncateThreshold = Infinity;

export function logDB() {
  const collections = Mongo.Collection.getAll();
  collections.forEach((collection) => {
    console.log(collection.name, '\n', collection.instance.find().fetch());
  });
}

function initializeDatabase() {
  initializePermissions();
  defineBreakdownTemplates();
  defineTxCatTemplates();
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
