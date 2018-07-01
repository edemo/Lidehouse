import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Journals } from './journals.js';

if (Meteor.isClient) {
  export const Legs = new Mongo.Collection(null);

  Meteor.startup(function syncLegsWithTxs() {
    const callbacks = {
      added(doc) {
        doc.separateLegs().forEach(leg => {
          Legs.insert(_.extend(leg, { txId: doc._id }));
        });
      },
      changed(newDoc, oldDoc) {
        console.log("Changed journal noticed:", oldDoc);
      },
      removed(doc) {
        Legs.remove({ txId: doc._id });
      },
    };
    Journals.find().observe(callbacks);
  });
}
