import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { moment } from 'meteor/momentjs:moment';

// Trash stores removed docs temporarily
export const TRASH_KEEP_DAYS = 90;

export const Trash = new Mongo.Collection('trash');

Meteor.startup(function indexParcels() {
  Trash.ensureIndex({ communityId: 1, collection: 1 });
  Trash.ensureIndex({ communityId: 1, deletedAt: -1 });
});

Trash.helpers({
  deleter() {
    return Meteor.users.findOne(this.deleterId);
  },
  restore() {
    const collectionName = this.collection;
    delete this.collection;
    this._id = this.id;
    delete this.id;
    Mongo.Collection.get(collectionName).insert(this);
    // TODO: For this to work, have to add _id field to every schema
  },
});

if (Meteor.isServer) {
  // Cannot write the Trash. Only with explicit hook avoider calling. Prevents accidents.
  Trash.before.insert(function () { return false; });
  Trash.before.update(function () { return false; });
  Trash.before.remove(function () { return false; });
}


export function emptyOldTrash() {
  const deletePoint = moment().subtract(TRASH_KEEP_DAYS, 'day').toDate();
  Trash.direct.remove({ deletedAt: { $lte: deletePoint } });
}
