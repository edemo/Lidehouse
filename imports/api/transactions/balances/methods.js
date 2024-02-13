import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Balances } from './balances.js';

function updateCTotal(doc) {
  Balances.update(
    { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: 'C' },
    { $set: { debit: doc.debit, credit: doc.credit,
      communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: 'C' } },
    { upsert: true },
  );
}

export const insert = new ValidatedMethod({
  name: 'balances.insert',
  validate: Balances.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Balances, { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: doc.tag });
    checkPermissions(this.userId, 'balances.insert', doc);
    checkConstraint(doc.tag.startsWith('C-'), 'Only closing balances can be manipulated directly');
    // T-balances get automatically updated by transactions, and P balances are created by balances.publish
    const result = Balances.insert(doc);
    // TODO: Here I am assumnig that you are uploading the Closing balances in an ascending time order
    updateCTotal(doc);
    return result;
  },
});

export const update = new ValidatedMethod({
  name: 'balances.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),
  run({ _id, modifier }) {
    const doc = checkExists(Balances, _id);
    checkPermissions(this.userId, 'balances.insert', doc);
    checkConstraint(doc.tag.startsWith('C-'), 'Only closing balances can be manipulated directly');
    checkModifier(doc, modifier, ['debit', 'credit']);
    const result = Balances.update(_id, modifier);
    // TODO: Here I am assumnig that you are uploading the Closing balances in an ascending time order
    updateCTotal(Balances.findOne(_id));
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'balances.remove',
  validate: null,
  run(doc) {
    throw new Meteor.Error('err_notImplemented');
  },
});

export const checkAllCorrect = new ValidatedMethod({
  name: 'balances.checkAllCorrect',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ communityId }) {
    if (Meteor.isClient) return; // No complete tx data on the client to perform check.
    const balanceStat = { count: 0, misCalculated: [] };
    const tBalances = Balances.find({ communityId, tag: new RegExp('^T') });
    balanceStat.count = tBalances.count();
    const lang = Meteor.users.findOne(this.userId).settings.language;
    tBalances.forEach((bal) => {
      delete bal._id;
      const foundWrong = Balances.checkCorrect(bal, lang);
      if (foundWrong) balanceStat.misCalculated.push(foundWrong);
    });
    return balanceStat;
  },
});

export const ensureAllCorrect = new ValidatedMethod({
  name: 'balances.ensureAllCorrect',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ communityId }) {
    checkPermissions(this.userId, 'balances.upsert', { communityId });
    Balances.ensureAllCorrect(communityId);
  },
});

/*
export const publish = new ValidatedMethod({
  name: 'balances.publish',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    checkPermissions(this.userId, 'balances.publish', { communityId });
    Accounts.coa(communityId).leafs().forEach((leaf) => {
      // Publish makes a copy of all T-balances, and mark it as a P-balance
      Balances.find({ communityId, account: leaf.code, tag: /^T. })
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
*/

Balances.methods = Balances.methods || {};
_.extend(Balances.methods, { insert, update, remove });
_.extend(Balances.methods, crudBatchOps(Balances));
