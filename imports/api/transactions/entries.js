import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Transactions } from './transactions.js';
import { AccountSpecification } from './account-specification.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-index';

export const JournalEntries = new Mongo.Collection(null);

Meteor.startup(function indexComments() {
  if (MinimongoIndexing) {
//      JournalEntries._collection._ensureIndex('account');
    JournalEntries._collection._ensureIndex(['account', 'localizer']);
    JournalEntries._collection._ensureIndex('txId');
  }
});

JournalEntries.helpers({
  effectiveAmount(extraSign = +1) {
    let dcSign = 0;
    if (this.side === 'debit') dcSign = +1;
    else if (this.side === 'credit') dcSign = -1;
    else debugAssert(false, `Unrecognized side: ${this.side}`);
    return this.amount * dcSign * extraSign;
  },
  transaction() {
    const tx = Transactions.findOne(this.txId);
    if (!tx) console.log(`Tx with id ${this.txId} NOT found`);
    return tx;
  },
  contra() {
    function otherSide(side) {
      if (side === 'credit') return 'debit';
      if (side === 'debit') return 'credit';
      debugAssert(false); return undefined;
    }
    const tx = this.transaction();
    if (!tx) return {};
    const contraEntries = tx[otherSide(this.side)];
    if (!contraEntries) return {};
    const contraAccount = AccountSpecification.fromDoc(contraEntries[0]);
    return contraAccount;
  },
});

if (Meteor.isClient) {
  Meteor.startup(function syncEntriesWithTransactions() {
    const callbacks = {
      added(doc) {
        doc.journalEntries().forEach(entry => {
          JournalEntries.insert(_.extend(entry, { txId: doc._id }));
        });
      },
      changed(newDoc, oldDoc) {
        console.log("Changed transaction noticed:", oldDoc);
      },
      removed(doc) {
        JournalEntries.remove({ txId: doc._id });
      },
    };
    Transactions.find().observe(callbacks);
  });
}
