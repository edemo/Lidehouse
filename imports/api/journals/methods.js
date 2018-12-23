import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Journals } from '/imports/api/journals/journals.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
// import { Txs } from '/imports/api/journals/txs.js';
// import { TxDefs } from '/imports/api/journals/tx-defs.js';

function runPositingRules(context, doc) {
  const isSubAccountOf = Breakdowns.isSubAccountOf.bind({ communityId: doc.communityId });
  if (doc.credit[0].account['Incomes'] && isSubAccountOf(doc.credit[0].account['Incomes'], 'Owner payins', 'Incomes')
    && doc.debit[0].account['Assets'] && isSubAccountOf(doc.debit[0].account['Assets'], 'Money accounts', 'Assets')) {
    const newDoc = _.clone(doc);
    newDoc.credit = [{
      account: {
        'Assets': doc.credit[0].account['Incomes'],  // Obligation decreases
        'Localizer': doc.credit[0].account['Localizer'],
      },
    }];
    newDoc.debit = [{
      account: {
        'Liabilities': doc.credit[0].account['Incomes'],
        'Localizer': doc.credit[0].account['Localizer'],
      },
    }];
    newDoc.sourceId = doc._id;
    Journals.insert(newDoc);
  }
}

export const insert = new ValidatedMethod({
  name: 'journals.insert',
  validate: Journals.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'journals.insert', doc.communityId);
    const id = Journals.insert(doc);
    runPositingRules(this, doc);
    return id;
  },
});

export const remove = new ValidatedMethod({
  name: 'journals.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Journals, _id);
    checkPermissions(this.userId, 'journals.remove', doc.communityId);
    if (doc.isOld()) {      // Not possible to delete tx after 24 hours
      Journals.insert(doc.negator());
      // throw new Meteor.Error('err_permissionDenied', 'No permission to remove transaction after 24 hours');
    } else {
      Journals.remove(_id);
    }
  },
});

//---------------------------------------------
/*
export const insert = new ValidatedMethod({
  name: 'txDefs.insert',
  validate: TxDefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    return TxDefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txDefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    TxDefs.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'txDefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    TxDefs.remove(_id);
  },
});
*/

