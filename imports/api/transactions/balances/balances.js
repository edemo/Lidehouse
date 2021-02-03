import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

export const Balances = new Mongo.Collection('balances');

// Definition of a balance
Balances.defSchema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  // phase: { type: String, defaultValue: 'done', allowedValues: ['real', 'plan'] },
  account: { type: String, optional: true, defaultValue: '`' },
  localizer: { type: String, optional: true },
  partner: { type: String, optional: true },  // format: 'partnerId/contractId'
  tag: { type: String, optional: true, defaultValue: 'T' },  // can be a period, end of a period, or a publication
}]);

// Definition + values of a balance
Balances.schema = new SimpleSchema([
  Balances.defSchema, {
    debit: { type: Number, defaultValue: 0 }, // debit sum
    credit: { type: Number, defaultValue: 0 }, // credit sum
  },
]);

Balances.idSet = ['communityId', 'account', 'localizer', 'tag'];

Balances.helpers({
  total() {
    return this.debit - this.credit;
  },
  debitSum() {
    return this.debit;
  },
  creditSum() {
    return this.credit;
  },
  debitTotal() {
    return (this.debit > this.credit) ? (this.debit - this.credit) : 0;
  },
  creditTotal() {
    return (this.credit > this.debit) ? (this.credit - this.debit) : 0;
  },
  displayTotal() {
    let displaySign = 1;
    if (this.account) {
      switch (this.account.charAt(1)) {
        case '1':
        case '2':
        case '3':
        case '8': displaySign = +1; break;
        case '4':
        case '5':
        case '9': displaySign = -1; break;
        default: break;
      }
    }
    return displaySign * this.total();
  },
});

Meteor.startup(function indexBalances() {
  Balances.ensureIndex({ communityId: 1, account: 1, localizer: 1, partner: 1, tag: 1 });
});

Balances.attachSchema(Balances.schema);
Balances.attachBehaviour(Timestamped);

Balances.get = function get(def) {
  Balances.defSchema.validate(def);
  let result = _.extend({ debit: 0, credit: 0 }, def);

//  This version is slower in gathering sub-accounts first,
//  but minimongo indexing does not handle sorting, so in fact might be faster after all
//  if (def.localizer) {
//    const parcel = Parcels.findOne({ communityId: def.communityId, code: def.localizer });
//    debugAssert(parcel.isLeaf()); // Currently not prepared for upward cascading localizer
    // If you want to know the balance of a whole floor or building, the transaction update has to trace the localizer's parents too
//  }
/*  leafs.forEach(leaf => {
    const balance = Balances.findOne({/
      communityId: def.communityId,
      account: leaf.code,
      localizer: def.localizer,
      tag: def.tag,
    });
    result += balance ? balance[side]() : 0;
  });*/

  // Aggregating sub-accounts balances with regexp
  const subdef = _.clone(def);
  if (def.account !== undefined) subdef.account = new RegExp('^' + def.account);
  subdef.localizer = def.localizer ? new RegExp('^' + def.localizer) : { $exists: false };
  subdef.partner = def.partner ? new RegExp('^' + def.partner) : { $exists: false };
  Balances.find(subdef).forEach((balance) => {
    result.debit += balance.debit;
    result.credit += balance.credit;
  });
  result = Balances._transform(result);
  return result;
};

Balances.checkNullBalance = function checkNullBalance(def) {
  const bal = Balances.get(def);
  if (bal.total) {
    throw new Meteor.Error('err_unableToRemove',
      'Accounting location cannot be deleted while it has outstanding balance', `Outstanding: {${bal.total}}`);
  }
};

function timeTagMatches(valueDate, tag) {
  return tag === 'T'; // TODO: support other tags as well
}

Balances.checkCorrect = function checkCorrect(def) {
  if (Meteor.isClient) return; // No complete tx data on the client to perform a check.
  if (def.tag !== 'T' || def.localizer) return; // TODO: support other tags / localizer as well
  const txs = Transactions.find({ communityId: def.communityId, $or: [{ 'debit.account': def.account }, { 'credit.account': def.account }] });
  let entryCount = 0;
  let calculatedBalance = 0;
  txs.forEach((tx) => {
    tx.journalEntries().forEach((entry) => {
      if (entry.account === def.account && timeTagMatches(entry.valueDate, def.tag)) {
        entryCount += 1;
        calculatedBalance += entry.effectiveAmount();
      }
    });
  });
  const dbBalance = Balances.get(def).total();
  if (dbBalance !== calculatedBalance) {
    Log.error('Balance inconsistency ERROR',
      `Calculated balance of '${def} is ${calculatedBalance} (from ${entryCount} entries)\nDb balance of same account: ${dbBalance}`
    );
    Log.info(txs.fetch());
  }
};

Balances.checkAllCorrect = function checkAllCorrect() {
  if (Meteor.isClient) return; // No complete tx data on the client to perform check.
  Balances.find({ tag: 'T' }).forEach((bal) => {
    delete bal._id;
    Balances.checkCorrect(bal);
  });
};

Balances.ensureAllCorrect = function ensureAllCorrect() {
  if (Meteor.isClient) return;
  Balances.remove({});
  Transactions.find({}).forEach((tx) => {
    tx.updateBalances(+1);
  });
};
