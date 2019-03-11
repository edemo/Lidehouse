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
  effectiveAmount() {
    let effectiveSign = 0;
    if (this.side === 'credit') effectiveSign = -1;
    if (this.side === 'debit') effectiveSign = +1;
    return this.amount * effectiveSign;
  },
  transaction() {
    const tx = Transactions.findOne(this.txId);
    return tx;
  },
  contra() {
    function otherSide(side) {
      if (side === 'credit') return 'debit';
      if (side === 'debit') return 'credit';
      debugAssert(false); return undefined;
    }
    const contraEntries = this.transaction()[otherSide(this.side)];
    if (!contraEntries) return '';
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
