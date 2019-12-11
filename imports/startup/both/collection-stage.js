import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

Array.prototype.fetch = function fetch() { return this; };

// The stage is a non-indexed temporary decorator for collection operations,
// which ops can later (after some checks) be commit-ed to the real collection or simply discard-ed.
class CollectionStage {
  constructor(collection) {
    this._collection = collection;
    this._fresh = new Mongo.Collection(null);
    this._fresh._transform = collection._transform;
    this._trash = []; // ids only
    this._operations = [];
  }
  find(selector, options) {
//    console.log('find', this._toString());
//    console.log('selector', selector);
    const freshResult = this._fresh.find(selector, options).fetch();
    let collectionResult = this._collection.find(selector, options).fetch();
//    console.log('freshResult', freshResult);
//    console.log('collectionResult', collectionResult);
    //  if the stage has a version of it, that is overriding the collection version
    freshResult.forEach(sdoc => {
      collectionResult = _.reject(collectionResult, doc => doc._id === sdoc._id);
    });
    let results = freshResult.concat(collectionResult);
    // find should return only docs that are not in the trash,
    results = _.reject(results, doc => _.contains(this._trash, doc._id));
//    console.log('results', results);
    return results;
  }
  findOne(selector, options) {
    return this.find(selector)[0];
  }
  insert(doc) {
    const _id = this._fresh.insert(doc);
    this._operations.push({ operation: this._collection.insert, params: [_.extend(doc, { _id })] });
//    console.log('insert', this._toString());
    return _id;
  }
  update(selector, modifier, options) {
    const collectionVersions = this._collection.find(selector);
    collectionVersions.forEach(doc => {
      if (!this._fresh.findOne(doc._id)) this._fresh.insert(doc);
    });
    const freshResult = this._fresh.update(selector, modifier, options);

    this._operations.push({ operation: this._collection.update, params: [selector, modifier, options] });
//    console.log('update', this._toString());
    return freshResult;
  }
  remove(selector) {
    const toRemoveIds = this.find(selector).map(doc => doc._id);
    this._trash = this._trash.concat(toRemoveIds);
    this._operations.push({ operation: this._collection.remove, params: [selector] });
//    console.log('remove', this._toString());
    return toRemoveIds.length;
  }
  _clear() {
    this._fresh.remove({});
    this._trash = [];
    this._operations = [];
  }
  commit() {
    this._operations.forEach(op => {
//      console.log("Applying", op.operation.name, op.params);
      const ret = op.operation.apply(this._collection, op.params);
//      console.log("ret", ret);
    });
    this._clear();
  }
  discard() {
    this._clear();
  }
  _toString() {
    return 'collection: ' + this._collection._name + '\n'
      + 'fresh: ' + JSON.stringify(this._fresh.find({}).fetch()) + '\n'
      + 'trash: ' + JSON.stringify(this._trash) + '\n'
      + 'operations: ' + JSON.stringify(this._operations) + '\n';
  }
}

Mongo.Collection.prototype.Stage = function Stage() {
//  if (!this._stage) this._stage = new CollectionStage(this); 
//  return this._stage;
  return new CollectionStage(this);
};

/*
class MongoProxy {
  constructor() {
    this._collections = {};
  }
  get(collectionName) {
    this._collections[collectionName] = this._collections[collectionName] || new CollectionProxy(collectionName);
    return this._collections[collectionName];
  }
}
*/