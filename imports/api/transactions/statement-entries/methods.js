import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';

import { Log } from '/imports/utils/log.js';
import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps, BatchMethod } from '/imports/api/batch-method.js';
import { namesMatch } from '/imports/utils/compare-names.js';
import { equalWithinUnit } from '/imports/localization/localization.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Relations } from '/imports/api/core/relations.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Recognitions } from '/imports/api/transactions/reconciliation/recognitions.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { reconciliationSchema } from '/imports/api/transactions/reconciliation/reconciliation.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { StatementEntries } from './statement-entries.js';

export const insert = new ValidatedMethod({
  name: 'statementEntries.insert',
  validate: StatementEntries.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = StatementEntries._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc);
    const _id = StatementEntries.insert(doc);
    StatementEntries.methods.recognize._execute({ userId: this.userId }, { _id });
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'statementEntries.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(StatementEntries, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.update', doc);

    const result = StatementEntries.update({ _id }, modifier);
    return result;
  },
});

function checkReconcileMatch(entry, transaction) {
  Log.debug('Reconciliaton check', 'entry:', entry, 'transaction:', transaction);
  function throwMatchError(mismatch, entryVal, txVal) {
    Log.info('Reconciliaton mismatch', JSON.stringify(mismatch));
    Log.info('entry', JSON.stringify(entry));
    Log.info('transaction', JSON.stringify(transaction));
    throw new Meteor.Error('err_notAllowed', 'Cannot reconcile entry with transaction - values not match', { mismatch, txVal, entryVal });
  }
  if (transaction.valueDate.getTime() !== entry.valueDate.getTime()) throwMatchError('valueDate', entry.valueDate, transaction.valueDate);
  let resultAmount;
  switch (transaction.category) {
    case 'payment':
    case 'receipt':
/*       resultAmount = transaction.amount + entry.reconciledAmount();
      if ((resultAmount >= 0 && resultAmount > (transaction.relationSign() * entry.amount))
       || (resultAmount < 0 && resultAmount < (transaction.relationSign() * entry.amount))) {
        throwMatchError('amount', entry.amount, resultAmount);
      } */
    //  if (!equalWithinUnit(transaction.amount, transaction.relationSign() * entry.amount, lang, accountCategory)) throwMatchError('amount', entry.amount, transaction.amount);
      if (transaction.payAccount !== entry.account) throwMatchError('account', entry.account, transaction.payAccount);
  //  if (!namesMatch(entry, transaction.partner().getName())) throwMatchError('partnerName');
      break;
    case 'transfer':
      if (transaction.toAccount === entry.account) {
        if (transaction.amount !== entry.amount) throwMatchError('amount', entry.amount, transaction.amount);
      } else if (transaction.fromAccount === entry.account) {
        if (transaction.amount !== -1 * entry.amount) throwMatchError('amount', entry.amount, transaction.amount);
      } else throwMatchError('account');
      break;
    case 'freeTx': break;
    default: throwMatchError('category');
  }
}

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: reconciliationSchema.validator(),
  run({ _id, txId }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    const communityId = entry.communityId;
    const reconciledTx = Transactions.findOne(txId);
    let newContractId;  // will be filled if a new contract is autocreated now
    if (Meteor.isServer) {
      debugAssert(!reconciledTx.reconciled, 'Transaction already reconciled');
      checkReconcileMatch(entry, reconciledTx);
      if (reconciledTx.category === 'payment') {
        // Machine learning the accounting
        const entryName = entry.nameOrType();
        if (reconciledTx.partnerId && entryName && entryName !== reconciledTx.partner().idCard.name) {
          Recognitions.set('name', entryName, reconciledTx.partner().idCard.name, { communityId });
        }
      } else if (reconciledTx.category === 'transfer') {
        const contraAccountField = entry.amount > 0 ? 'fromAccount' : 'toAccount';
        const contraBankAccount = Accounts.findOneT({ communityId, category: 'bank', code: reconciledTx[contraAccountField] });
        if (contraBankAccount?.BAN && entry.contraBAN && contraBankAccount.BAN !== entry.contraBAN) {
          Recognitions.set('BAN', entry.contraBAN, contraBankAccount.BAN, { communityId });
        }
      }
    }
    Transactions.update(txId, { $push: { seId: _id }, $set: { contractId: newContractId } });
    StatementEntries.update(_id, { $push: { txId }, $unset: { match: '' } });
  },
});

export const unReconcile = new ValidatedMethod({
  name: 'statementEntries.unReconcile',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    StatementEntries.update(_id, { $unset: { txId: '' } });
//    Transactions.find({ seId: entry._id }).forEach(tx => {
//      if (tx.seId.length > 1) Transactions.update({ _id: tx._id }, { $pull: { seId: entry._id } });
//      else Transactions.update({ _id: tx._id }, { $unset: { seId: '' } });
//    });
    Transactions.update({ seId: entry._id }, { $pull: { seId: entry._id } }, { multi: true });
    StatementEntries.methods.recognize._execute({ userId: this.userId }, { _id });
  },
});

export const autoReconcile = new ValidatedMethod({
  name: 'statementEntries.autoReconcile',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (entry.match?.confidence === 'primary' || entry.match?.confidence === 'success' || entry.match?.confidence === 'info') {
      let txId = entry.match.txId;
      if (Meteor.isServer) {
        if (txId && !Transactions.findOne(txId)) {
          StatementEntries.update(_id, { $unset: { match: '' } });
          StatementEntries.methods.recognize._execute({ userId: this.userId }, { _id });
          throw new Meteor.Error('err_notExists', 'Transaction was removed');
        }
      }
      if (!txId && entry.match.tx) {
        txId = Transactions.methods.insert._execute({ userId: this.userId }, entry.match.tx);
      }
      if (txId) {
        return reconcile._execute({ userId: this.userId }, { _id, txId });
      } else {  // Transactions.methods.insert can return with false, on the client, if there is no period open
        debugAssert(Meteor.isClient);
        return false;
      }
    }
    return null;
  },
});

function matchWithExistingOrCreateTx(se, tx, confidence) {
  Log.debug(tx);
  const selector = tx; // _.omit(tx, 'contract', 'lines');
  const community = se.community();
  const existingTx = (community.settings.paymentsWoStatement || tx.category === 'transfer')
    && Transactions.find(selector).fetch().filter(t => t.needsReconcile())[0];
  const $set = { match: { confidence } };
  if (existingTx) $set.match.txId = existingTx._id;
  else $set.match.tx = tx;
  StatementEntries.update(se._id, { $set });
}

export const recognize = new ValidatedMethod({
  name: 'statementEntries.recognize',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    const communityId = entry.communityId;
    const community = Communities.findOne(communityId);
    const payAccountCategory = Accounts.getByCode(entry.account, communityId)?.category;
    Log.info('Trying to recognize statement entry:', _id);
    let serialId;
    let matchingBill;
    if (entry.note) {
      const noteSplit = entry.note.deaccent().toUpperCase().split(' ');
      const regex = TAPi18n.__('BIL', {}, community.settings.language) + '/';
      serialId = noteSplit.find(s => s.startsWith(regex));
      if (serialId) {
        Log.debug('Serial id:', serialId);
        matchingBill = Transactions.findOne({ communityId: entry.communityId, serialId });
        Log.debug('Matching bill:', matchingBill);
      }
    }
    let partner;
    const entryName = entry.nameOrType();
    if (entryName) {
      Log.debug('Looking for partner', entryName, 'in', entry.communityId);
      const recognizedName = Recognitions.get('name', entryName, { communityId }) || entryName;
      partner = Partners.findOne({ communityId: entry.communityId, 'idCard.name': recognizedName });
    } else {
      Log.debug('No partner on statement');
    }
    let contraBankAccount;
    if (!partner) {
      const recognizedContraBAN = (entry.contraBAN && Recognitions.get('BAN', entry.contraBAN, { communityId })) || entry.contraBAN;
      contraBankAccount = recognizedContraBAN && Accounts.findOne({ communityId, category: 'bank', BAN: recognizedContraBAN });
    }
    // ---------------------------
    // 0th grade - 'direct' match: We find an existing payment tx, which can be mathched to this entry
    // ---------------------------
    if (community.settings.paymentsWoStatement && !contraBankAccount) {
      let matchingTxs = Transactions.find({ communityId, category: 'payment', valueDate: entry.valueDate, amount: Math.abs(entry.amount) })
        .fetch().filter(t => t.needsReconcile());
      if (matchingTxs?.length) {
        let matchingTx;
        let confidence;
        if (matchingBill) matchingTx = matchingTxs.find(tx => tx.bills?.[0]?.id === matchingBill._id);
        if (matchingTx) confidence = 'primary';
        else {
          if (partner) {
            matchingTxs = matchingTxs.filter(tx => tx.partnerId === partner._id);
          }
          matchingTx = matchingTxs[0];
          confidence = matchingTxs.length > 1 ? 'warning' : 'info';
        }
        if (matchingTx) {
          Log.info('Direct match with payment', matchingTx._id);
          Log.debug(matchingTx);
          StatementEntries.update(_id, { $set: { match: { confidence, txId: matchingTx._id } } });
          return;
        }
      }
    }
    // ---------------------------
    // 1st grade - 'primary' match: We find the correct BILL REF in the NOTE
    // ---------------------------
    if (serialId) {
      if (matchingBill) {
        const adjustedEntryAmount = matchingBill.relationSign() * entry.amount;
        if (equalWithinUnit(matchingBill.outstanding, adjustedEntryAmount, community.settings.language, payAccountCategory)) {
          const tx = {
            communityId,
            category: 'payment',
            relation: matchingBill.relation,
            partnerId: matchingBill.partnerId,
            contractId: matchingBill.contractId,
            defId: matchingBill.correspondingPaymentTxdef()._id,
            valueDate: entry.valueDate,
            payAccount: entry.account,
            amount: adjustedEntryAmount,
            bills: [{ id: matchingBill._id, amount: matchingBill.outstanding }],
          };
          Log.info('Primary match with bill', matchingBill._id);
          Log.debug(tx);
          StatementEntries.update(_id, { $set: { match: { confidence: 'primary', tx } } });
          return;
        }
      }
    }
    let relation;
    if (partner) {
      if (partner.relation.length === 1) relation = partner.relation[0];
      else {
        const possibleRelations = _.filter(partner.relation, r => Relations.sign(r) === Math.sign(entry.amount));
        if (possibleRelations.length > 1) {
          relation = _.find(possibleRelations, r => Transactions.findOne({ communityId, category: 'bill', relation: r, outstanding: { $ne: 0 } }));
        } else if (possibleRelations.length === 1) {
          relation = possibleRelations[0];
        } else Log.debug('No appropriate relation of partner');
      }
    } else {
      Log.debug('No appropriate partner found');
    }
    if (!partner || !relation) {
      if (contraBankAccount) {
        const tx = {
          communityId,
          category: 'transfer',
          defId: Txdefs.getByName('Money transfer', communityId)._id,
          valueDate: entry.valueDate,
          amount: Math.abs(entry.amount),
        };
        if (entry.amount > 0) {
          tx.toAccount = entry.account;
          tx.fromAccount = contraBankAccount.code;
        } else {
          tx.toAccount = contraBankAccount.code;
          tx.fromAccount = entry.account;
        }
        // ---------------------------
        // 2nd grade, 'success' match: Transfer
        // ---------------------------
        Log.info('Success match transfer');
        matchWithExistingOrCreateTx(entry, tx, 'success');
      }
      return;
    }

    const contract = partner.contracts(relation)?.[0];
    const adjustedEntryAmount = entry.amount * Relations.sign(relation);
    const matchingBills = Transactions.find({ communityId, category: 'bill', relation, partnerId: partner._id, outstanding: { $ne: 0 } }, { sort: { issueDate: 1 } }).fetch();
    const paymentDef = Txdefs.findOneT({ communityId: entry.communityId, category: 'payment', 'data.relation': relation, 'data.paymentSubType': 'payment' });
    debugAssert(paymentDef.touches('`38')); // Identification is also a payment, but that touches 431
    const tx = {
      communityId,
      category: 'payment',
      relation,
      partnerId: partner._id,
      contractId: contract?._id,
      defId: paymentDef._id,
      valueDate: entry.valueDate,
      payAccount: entry.account,
      amount: adjustedEntryAmount,
    };
    if (entry.amount === partner.balance() * -1) {
      // ---------------------------
      // 2nd grade, 'success' match: The payment exactly matches the outstanding bills of the partner
      // ---------------------------
      tx.bills = matchingBills.map(bill => ({ id: bill._id, amount: bill.outstanding }));
      tx.lines = [];
      Log.info('Success match with bills', matchingBills.length);
      Log.debug(tx);
      StatementEntries.update(_id, { $set: { match: { confidence: 'success', tx } } });
    } else {
      // ---------------------------
      // 3rd grade, 'info' match: We found the partner but the payment is not the right amount.
      // Either under-paid (=> need to decide which bills are paid), or over-paid (=> need to decide where to allocate the remainder)
      // ---------------------------
      tx.bills = []; tx.lines = [];
      let amountToFill = adjustedEntryAmount;
      let confidence = 'info';
      if (_.contains(community.settings.paymentsToBills, relation)) {
        let totalOutstanding = 0;
        for (const bill of matchingBills) {
          totalOutstanding += bill.outstanding;
        }
        if (Math.sign(adjustedEntryAmount) === Math.sign(totalOutstanding)) {
          for (const bill of matchingBills.oppositeSignsFirst(totalOutstanding, 'amount')) {
            if (amountToFill === 0) break;
            let amount;
            if (amountToFill >= 0) amount = bill.outstanding >= 0 ? Math.min(amountToFill, bill.outstanding) : bill.outstanding;
            if (amountToFill < 0) amount = bill.outstanding < 0 ? Math.max(amountToFill, bill.outstanding) : bill.outstanding;
            tx.bills.push({ id: bill._id, amount });
            amountToFill -= amount;
          }
        } else confidence = 'warning';
      } else {
        const localizer = contract?.accounting?.localizer;
        if (relation === 'member' && !localizer) confidence = 'warning';
        tx.lines = [
          Object.cleanUndefined({
            amount: amountToFill,
            account: contract?.accounting?.account || paymentDef.conteerCodes(false, community.settings.accountingMethod)[0],
            localizer,
          }),
        ];
      }
      // }
      Log.info('Info match with bills', matchingBills.length);
      Log.debug(tx);
      StatementEntries.update(_id, { $set: { match: { confidence, tx } } });
    }
  },
});
/*
export const autoReconciliation = new ValidatedMethod({
  name: 'statementEntries.autoReconciliation',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    StatementEntries.find({ communityId, match: { $exists: false } }).forEach(entry => {
      reconcile._execute({ userId: this.userId }, { _id: entry._id });
    });
  },
});

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  }).validator(),

  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!entry.match) throw new Meteor.Error('err_notExists', 'No match provided to reconcile ' + entry._id + ' with');
    const reconciledTx = entry.match._id ? Transactions.findOne(entry.match._id) : Transactions._transform(entry.match);
    checkReconcileMatch(entry, reconciledTx);
    if (!reconciledTx._id) {
      reconciledTx._id = Transactions.methods.insert._execute({ userId: this.userId }, reconciledTx);
      Transactions.methods.post._execute({ userId: this.userId }, { _id: reconciledTx._id });
    }
    Transactions.update(reconciledTx._id, { $set: { txId: _id } });
    const result = StatementEntries.update(_id, { $set: { txId: reconciledTx._id } });
    return result;
  },
});
*/
export const remove = new ValidatedMethod({
  name: 'statementEntries.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.remove', doc);

    return StatementEntries.remove(_id);
  },
});

StatementEntries.methods = StatementEntries.methods || {};
_.extend(StatementEntries.methods, { insert, update, recognize, reconcile, unReconcile, autoReconcile, remove });
_.extend(StatementEntries.methods, crudBatchOps(StatementEntries));
StatementEntries.methods.batch.recognize = new BatchMethod(StatementEntries.methods.recognize);
StatementEntries.methods.batch.reconcile = new BatchMethod(StatementEntries.methods.reconcile);
StatementEntries.methods.batch.autoReconcile = new BatchMethod(StatementEntries.methods.autoReconcile);
