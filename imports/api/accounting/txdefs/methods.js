import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';

export const insert = new ValidatedMethod({
  name: 'txdefs.insert',
  validate: Txdefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Txdefs, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Txdefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txdefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    let doc = checkExists(Txdefs, _id);
    const communityId = modifier.$set?.communityId || doc.communityId;
    const community = Communities.findOne(communityId);
    if (communityId !== doc.communityId) { // Editing a template entry (doc.communityId is the templlateId)
      checkConstraint(community.settings.templateId === doc.communityId, 'You can update only from your own template');
      checkPermissions(this.userId, 'accounts.update', { communityId });
      const clonedDocId = Txdefs.clone(doc, communityId);
      doc = Txdefs.findOne(clonedDocId);
    }
    checkPermissions(this.userId, 'accounts.update', doc);
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other accounts
    checkNotExists(Txdefs, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    // Check that the existing txs with this txdef conform to the new debit and credit list. 
    const removedDebitAccounts = modifier.$set.debit ? Array.difference(doc.debit, modifier.$set.debit) : [];
    const removedCreditAccounts = modifier.$set.credit ? Array.difference(doc.credit, modifier.$set.credit) : [];
    if (removedDebitAccounts.length > 0 || removedCreditAccounts.length > 0) {
      const txs = Transactions.find({ communityId, defId: _id });
      txs.forEach(tx => {
        tx.journalEntries(true).forEach(je => {
          if (je.side === 'debit' && removedDebitAccounts.includes(je.account)) {
            throw new Meteor.Error('err_notAllowed', 'Cannot remove account, transaction uses it.', { side: 'debit', account: je.account, tx });
          }
          if (je.side === 'credit' && removedCreditAccounts.includes(je.account)) {
            throw new Meteor.Error('err_notAllowed', 'Cannot remove account, transaction uses it.', { side: 'credit', account: je.account, tx });
          }
        });
      });
    }

    return Txdefs.update({ _id: doc._id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'txdefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Txdefs, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);
    const communityId =  doc.communityId;
    const community = Communities.findOne(communityId);
    if (!community.isTemplate) {
      const templateTxdef = Txdefs.findOne({ communityId: community.settings.templateId, name: doc.name });
      if (templateTxdef && _.isEqual(templateTxdef.debit, doc.debit) && _.isEqual(templateTxdef.credit, doc.credit)) {
        Transactions.direct.update({ communityId, defId: doc._id }, { $set: { defId: templateTxdef._id } }, { multi: true });
      } else {
        checkNotExists(Transactions, { communityId, defId: _id });
      }
    } else {
      checkNotExists(Transactions, { defId: _id });
    }

    return Txdefs.remove(_id);
  },
});

Txdefs.methods = Txdefs.methods || {};
_.extend(Txdefs.methods, { insert, update, remove });
_.extend(Txdefs.methods, crudBatchOps(Txdefs));