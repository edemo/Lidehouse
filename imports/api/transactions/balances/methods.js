
import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { checkExists, checkNotExists, checkPermissions, checkConstraint } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Balances } from './balances.js';

export const insert = new ValidatedMethod({
  name: 'balances.insert',
  validate: Balances.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Balances, { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: doc.tag });
    checkPermissions(this.userId, 'balances.insert', doc.communityId);
    checkConstraint(doc.tag.startsWith('C-'), 'Only closing balances can be inserted directly');
    // T-balances get automatically updaed by transactions, and P balances are created by balances.publish
    const result = Balances.insert(doc);
    // TODO: Here I am assumnig that you are uploading the Closing balances in an ascending time order
    Balances.update(
      { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: 'C' },
      { $set: { debit: doc.debit, credit: doc.credit,
        communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: 'C' } },
      { upsert: true }
    );
    return result;
  },
});

export const update = new ValidatedMethod({
  name: 'balances.update',
  validate: null,
  run(doc) {
    throw new Meteor.Error('err_notImplemented');
  },
});

export const remove = new ValidatedMethod({
  name: 'balances.remove',
  validate: null,
  run(doc) {
    throw new Meteor.Error('err_notImplemented');
  },
});

export const publish = new ValidatedMethod({
  name: 'balances.publish',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    checkPermissions(this.userId, 'balances.publish', communityId);
    const coa = ChartOfAccounts.get(communityId);
    coa.leafs().forEach((leaf) => {
      // Publish makes a copy of all T-balances, and mark it as a P-balance
      Balances.find({ communityId, account: leaf.code, tag: /^T.*/ })
        .forEach((tBalance) => {
          Balances.update({
            communityId,
            account: leaf.code,
            tag: 'P' + tBalance.tag.substring(1),
          }, {
            $set: {
              communityId,
              account: leaf.code,
              tag: 'P' + tBalance.tag.substring(1),
              debit: tBalance.debit,
              credit: tBalance.credit,
            },
          },
          { upsert: true },
          );
        });
      // TODO: Publish should calculate the C-balances from the P-balances
    });
  },
});

Balances.methods = Balances.methods || {};
_.extend(Balances.methods, { insert, update, remove, publish });
_.extend(Balances.methods, crudBatchOps(Balances));
