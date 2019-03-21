import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import '/imports/api/transactions/breakdowns/methods.js';
import '/imports/api/transactions/txdefs/methods.js';

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

export const publish = new ValidatedMethod({
  name: 'transactions.publish',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    checkPermissions(this.userId, 'transactions.publish', communityId);
//    Balances.find({ communityId, tag: 'T' }).forEach((bal) => {
//      delete bal._id;
//      bal.tag = 'P';
//      Balances.insert(bal);
//    });
  },
});

export const cloneAccountingTemplates = new ValidatedMethod({
  name: 'transactions.cloneAccountingTemplates',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
//    name: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId /*, name*/ }) {
    checkPermissions(this.userId, 'breakdowns.insert', communityId);
    const user = Meteor.users.findOne(this.userId);
    const breakdownsToClone = Breakdowns.find({ communityId: null }).map(brd => brd.name);
    breakdownsToClone.forEach((breakdownName) => {
      Breakdowns.methods.clone._execute(
        { userId: this.userId },
        { name: breakdownName, communityId },
      );
    });
    const txDefsToClone = TxDefs.find({ communityId: null }).map(td => td.name);  // TODO select whats needed
    txDefsToClone.forEach((txDefName) => {
      TxDefs.methods.clone._execute(
        { userId: this.userId },
        { name: txDefName, communityId },
      );
    });
    Localizer.generateParcels(communityId, user.settings.language);
  },
});

Transactions.methods = {
  insert, update, remove, publish, cloneAccountingTemplates,
};

