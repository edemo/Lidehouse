import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { Log } from '/imports/utils/log.js';

// The stage is a non-indexed temporary decorator for collection operations,
// which ops can later (after some checks) be commit-ed to the real collection or simply discard-ed.
function CollectionStage(collection) {
  this._collection = collection;
  this._fresh = new Mongo.Collection(null);
  this._fresh._transform = collection._transform;
  // Should we attach the collections's schema here? Rather than validate by hand in the insert, update.
  this._trash = []; // ids only
  this._operations = [];
  // some of the api needs to be copied over
  this._name = collection._name + '_stage';
  this.idSet = collection.idSet;
}

// Must be able to call findActive and other static helpers on the Stage
CollectionStage.prototype = Object.create(Mongo.Collection.prototype);
CollectionStage.prototype.constructor = CollectionStage;

// But the standard Collection API needs to be overriden
CollectionStage.prototype.find = function find(selector, options) {
//    Log.debug('find', this._toString());
//    Log.debug('selector', selector);
  const freshResult = this._fresh.find(selector, options).fetch();
  let collectionResult = this._collection.find(selector, options).fetch();
//    Log.debug('freshResult', freshResult);
//    Log.debug('collectionResult', collectionResult);
  //  if the stage has a version of it, that is overriding the collection version
  freshResult.forEach(sdoc => {
    collectionResult = _.reject(collectionResult, doc => doc._id === sdoc._id);
  });
  let results = freshResult.concat(collectionResult);
  // find should return only docs that are not in the trash,
  results = _.reject(results, doc => _.contains(this._trash, doc._id));
//    Log.debug('results', results);
  if (options?.sort) {
    const sortKey = Object.keys(options.sort)[0];
    const sortValue = Object.values(options.sort)[0];
    if (sortKey && (sortValue === +1 || sortValue === -1)) {
      results = _.sortBy(results, doc => Object.getByString(doc, sortKey));
      if (sortValue === -1) {
        results = results.reverse();
      }
    }
  }
  return results;
};

CollectionStage.prototype.findOne = function findOne(selector, options) {
  return this.find(selector, options)[0];
};

CollectionStage.prototype.insert = function insert(doc) {
  this._collection.simpleSchema(doc)?.validator({ clean: true })(doc);  // needed to check doc validity, before sanity
  const _id = this._fresh.insert(doc);
  this._operations.push({ operation: this._collection.insert, params: [_.extend(doc, { _id })] });
//    Log.debug('insert', this._toString());
  return _id;
};

CollectionStage.prototype.update = function update(selector, modifier, options) {
  const collectionVersions = this._collection.find(selector);
  collectionVersions.forEach(doc => {
    if (!this._fresh.findOne(doc._id)) this._fresh.insert(doc);
    this._collection.simpleSchema(doc)?.validate(modifier, { modifier: true });  // needed to check doc validity, before sanity
  });
  const freshResult = this._fresh.update(selector, modifier, options);
  this._operations.push({ operation: this._collection.update, params: [selector, modifier, options] });
//    Log.debug('update', this._toString());
  return freshResult;
};

CollectionStage.prototype.remove = function remove(selector) {
  const toRemoveIds = this.find(selector).map(doc => doc._id);
  this._trash = this._trash.concat(toRemoveIds);
  this._operations.push({ operation: this._collection.remove, params: [selector] });
//    Log.debug('remove', this._toString());
  return toRemoveIds.length;
};

CollectionStage.prototype._clear = function _clear() {
  this._fresh.remove({});
  this._trash = [];
  this._operations = [];
};

CollectionStage.prototype.commit = function commit() {
  this._operations.forEach(op => {
//      Log.debug("Applying", op.operation.name, op.params);
    const ret = op.operation.apply(this._collection, op.params);
//      Log.debug("ret", ret);
  });
  this._clear();
};

CollectionStage.prototype.discard = function discard() {
  this._clear();
};

CollectionStage.prototype._toString = function _toString() {
  return 'collection: ' + this._collection._name + '\n'
    + 'fresh: ' + JSON.stringify(this._fresh.find({}).fetch()) + '\n'
    + 'trash: ' + JSON.stringify(this._trash) + '\n'
    + 'operations: ' + JSON.stringify(this._operations) + '\n';
};

Mongo.Collection.prototype.Stage = function Stage() {
//  if (!this._stage) this._stage = new CollectionStage(this); 
//  return this._stage;
  return new CollectionStage(this);
};
