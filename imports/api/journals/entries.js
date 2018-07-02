import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Journals } from './journals.js';

if (Meteor.isClient) {
  export const JournalEntries = new Mongo.Collection(null);

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
