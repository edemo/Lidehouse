import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
// import { Txs } from '/imports/api/transactions/txs.js';
// import { TxDefs } from '/imports/api/transactions/tx-defs.js';

/*
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
    Transactions.insert(newDoc);
  }
}
*/

export const insert = new ValidatedMethod({
  name: 'transactions.insert',
  validate: Transactions.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    const id = Transactions.insert(doc);
//    runPositingRules(this, doc);
    return id;
  },
});

export const update = new ValidatedMethod({
  name: 'transactions.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Transactions, _id);
    checkModifier(doc, modifier, ['communityId'], true);
    checkPermissions(this.userId, 'transactions.update', doc.communityId);
    if (doc.isSolidified() && doc.complete) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to modify transaction after 24 hours');
    }
    Transactions.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'transactions.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.remove', doc.communityId);
    if (doc.isSolidified() && doc.complete) {
      // Not possible to delete tx after 24 hours, but possible to negate it with another tx
      Transactions.insert(doc.negator());
    } else {
      Transactions.remove(_id);
    }
  },
});

Transactions.methods = {
  insert, remove,
};

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

