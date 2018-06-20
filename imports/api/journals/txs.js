import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';
import { Journals } from './journals.js';
import { Breakdowns } from '../journals/breakdowns/breakdowns.js';

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
