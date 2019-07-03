import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import 'meteor/helfer:minimongo-index';

export const MinimongoIndexing = true;

// With this function you can create the same logical index on the client and server sides
// https://github.com/helfer/minimongo-index/issues/1
// This might be a good or a not so good idea, because implementations of indexes are very different technically
// server side indices are ordered, and client side inidices are not.
Mongo.Collection.prototype.ensureIndex = function ensureIndex(map, options) {
  if (Meteor.isServer) {
    this._ensureIndex(map, options);
  }
  if (Meteor.isClient && MinimongoIndexing) {
    const fields = Object.keys(map);
    const index = fields.length === 1 ? fields[0] : fields;
    this._collection._ensureIndex(index);
  }
};

Mongo.Collection.prototype.define = function define(selector, doc) {
  const existingId = this.findOne(selector);
  if (existingId) {
    this.update(existingId, { $set: doc });
    return existingId;
  }
  return this.insert(doc);
};

Mongo.Collection.prototype.attachBehaviour = function attach(behaviour) {
  const collection = this;
  collection.attachSchema(behaviour.schema);
  collection.helpers(behaviour.helpers);
//  const methodsToAttach = _.extend({}, behaviour.methods);
//  _.forEach(methodsToAttach, function (key, validatedMethod) {
//    validatedMethod.name = collection._name + '.' + validatedMethod.name;
//  });
//  _.extend(this.methods, methodsToAttach);
};
