import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
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

Mongo.Collection.prototype.attachBehaviour = function attach(behaviour) {
  const collection = this;
  collection.attachSchema(behaviour.schema);
  collection.helpers(behaviour.helpers);

  collection.methods = collection.methods || {};
  _.forEach(behaviour.methods, (method, key) => {
    const methodCopy = new ValidatedMethod({
      name: collection._name + '.' + method.name,
      validate: method.validate,
      run: method.run,
    });
    _.extend(collection.methods, { [key]: methodCopy });
  });

  // if (Meteor.isClient) return;  // No hooking on the client side
  _.each(behaviour.hooks, (actions, when) => {
    _.each(actions, (actionFunc, action) => {
      collection[when][action](actionFunc);
    });
  });
};
