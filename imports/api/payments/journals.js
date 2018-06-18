import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Payments } from './payments.js';

class AssertiveObject {
  constructor(obj) {
    this._obj = obj;
  }
  get(key) {
    const val = this._obj[key];
    debugAssert(val, `Journal param missing: ${key} \nfrom ${this._obj}`);
    return val;
  }
}

export function insertJournal(name, txBase, journalParams) {
  const txAccountProps = [];
  const params = new AssertiveObject(journalParams);
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
    Payments.insert(tx);
  });
}
