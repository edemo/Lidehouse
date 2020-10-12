import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import 'meteor/helfer:minimongo-index';
import { debugAssert } from '/imports/utils/assert.js';

export const MinimongoIndexing = true;

Mongo.Collection.stripAdministrativeFields = function(doc) {
  delete doc._id;
  delete doc.createdAt;
  delete doc.creatorId;
  delete doc.updatedAt;
  delete doc.updaterId;
  delete doc.postedAt;
};

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

/*
const collection2attachSchema = Mongo.Collection.prototype.attachSchema;
Mongo.Collection.prototype.attachSchema = function attachSchema(schema, options) {
  const collection = this;
  debugAssert(!collection._baseSchemas);
  return collection2attachSchema(schema, options);
};
*/

Mongo.Collection.prototype.attachBaseSchema = function attachBaseSchema(schema, options) {
  debugAssert(!options);
  const collection = this;
  // collection2 treats !options.selector as you don't want variant schemas at all
  // but we do, and we want this schema part to be a common part among them
//  collection._baseSchemas = collection._baseSchemas || [];
//  collection._baseSchemas.push(schema);
  collection._baseSchema = new SimpleSchema([collection._baseSchema || {}, schema]);
};

Mongo.Collection.prototype.attachBehaviour = function attachBehaviour(behaviour) {
  const collection = this;
  if (collection.simpleSchema()) collection._applyBehaviour(behaviour);
  else {
    collection._behaviours = collection._behaviours || [];
    collection._behaviours.push(behaviour);
  }
//  collection._baseSchema = new SimpleSchema([collection._baseSchema || {}, behaviour.schema]);
};

Mongo.Collection.prototype.attachVariantSchema = function attachVariantSchema(schema, options) {
  debugAssert(options.selector);
  const collection = this;
  collection.attachSchema(collection._baseSchema, options);
  collection.attachSchema(schema, options);
  collection._behaviours.forEach(behaviour => {
    collection._applyBehaviour(behaviour, options);
  });
};

Mongo.Collection.prototype._applyBehaviour = function _applyBehaviour(behaviour, options) {
  const collection = this;
  collection.attachSchema(behaviour.schema, options);
  // TODO: Only 0 values supported in public fields
  if (behaviour.publicFields && collection.publicFields) {
    collection.publicFields = _.extend({}, collection.publicFields, behaviour.publicFields);
  }
  if (behaviour.modifiableFields && collection.modifiableFields) {
    collection.modifiableFields = _.union(collection.modifiableFields, behaviour.modifiableFields);
  }

  collection._behaviourMethodsApplied = collection._behaviourMethodsApplied || {};
  if (collection._behaviourMethodsApplied[behaviour.name]) return;
  collection._behaviourMethodsApplied[behaviour.name] = true;

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
  const hooks = (typeof behaviour.hooks === 'function') ? behaviour.hooks(collection) : behaviour.hooks;
  _.each(hooks, (actions, when) => {
    _.each(actions, (actionFunc, action) => {
      collection[when][action](actionFunc);
    });
  });

  if (behaviour.indexes) {
    Meteor.startup(() => behaviour.indexes(collection));
  }
};
