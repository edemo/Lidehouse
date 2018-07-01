/*
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';

import { Journals } from './journals.js';
import { Breakdowns } from '../journals/breakdowns/breakdowns.js';

export const Txs = new Mongo.Collection('txs');

Txs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  defId: { type: String, regEx: SimpleSchema.RegEx.Id },
  valueDate: { type: Date },
  amount: { type: Number },
  accounts: { type: Array, optional: true },
  'accounts.$': { type: Object, blackbox: true },
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
  journalIds: { type: Array, defaultValue: [] },
  'journalIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },
});

Txs.attachSchema(Txs.schema);
Txs.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Txs.simpleSchema().i18n('schemaTxs');
});

Txs.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});


class AssertiveObject {
  constructor(obj) {
    this._obj = obj;
  }
  get(key) {
    const val = this._obj[key];
    debugAssert(val, `Tx param missing: ${key} \nfrom ${this._obj}`);
    return val;
  }
}

export function insertTx(name, txBase, txParams) {
  const txAccountProps = [];
  const params = new AssertiveObject(txParams);
  if (name === 'Obligation') {
    txAccountProps.push({
      accountFrom: {
        'Owners': params.get('Owner payins'),
        'Localizer': params.get('Localizer'),
      },
      accountTo: {
        'Assets': params.get('Owner payins'),
        'Localizer': params.get('Localizer'),
      },
    });
  } else if (name === 'Payin') {
    txAccountProps.push({
      accountFrom: {
        'Incomes': params.get('Owner payins'),
        'Localizer': params.get('Localizer'),
      },
      accountTo: {
        'Assets': params.get('Assets'),
      },
    });
    txAccountProps.push({
      accountFrom: {
        'Assets': params.get('Owner payins'),
        'Localizer': params.get('Localizer'),
      },
      accountTo: {
        'Owners': params.get('Owner payins'),
        'Localizer': params.get('Localizer'),
      },
    });
  }

  txAccountProps.forEach((txAP) => {
    const tx = _.extend({}, txBase, txAP);
    Journals.insert(tx);
  });
}
;
*/

