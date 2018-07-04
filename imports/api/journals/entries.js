import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Journals } from './journals.js';
import { AccountSpecification } from './account-specification.js';

if (Meteor.isClient) {
  export const JournalEntries = new Mongo.Collection(null);

  JournalEntries.helpers({
    effectiveAmount() {
      let effectiveSign = 0;
      if (this.move === 'from') effectiveSign = -1;
      if (this.move === 'to') effectiveSign = +1;
      return this.amount * effectiveSign;
    },
    journal() {
      return Journals.findOne(this.txId);
    },
    contra() {
      function otherSide(move) {
        if (move === 'from') return 'to';
        if (move === 'to') return 'from';
        debugAssert(false); return undefined;
      }
      const contraEntries = this.journal()[otherSide(this.move)];
//      debugger;
      if (!contraEntries) return '';
      const contraAccount = AccountSpecification.fromTags(contraEntries[0].account);
      return contraAccount;
    },
  });

  Meteor.startup(function syncEntriesWithJournals() {
    const callbacks = {
      added(doc) {
        doc.journalEntries().forEach(entry => {
          JournalEntries.insert(_.extend(entry, { txId: doc._id }));
        });
      },
      changed(newDoc, oldDoc) {
        console.log("Changed journal noticed:", oldDoc);
      },
      removed(doc) {
        JournalEntries.remove({ txId: doc._id });
      },
    };
    Journals.find().observe(callbacks);
  });
}
