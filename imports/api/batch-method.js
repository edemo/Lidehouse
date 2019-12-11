/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkPermissions } from '/imports/api/method-checks.js';

const batchOperationSchema = new SimpleSchema({
//  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  args: { type: Array },
  'args.$': { type: Object, blackbox: true }, // Each arg will be checked against the schema when individual method execution happens
});

export class BatchMethod extends ValidatedMethod {
  constructor(method) {
    const batchMethodName = method.name + '.batch';
    const options = {
      name: batchMethodName,
      validate: batchOperationSchema.validator({ clean: true }),
      run({ args }) {
//        console.log("running batch with", args.length, ":", args[0]);
        const userId = this.userId;
//        checkPermissions(userId, method.name, communityId);  // Whoever has perm for the method, can do it in batch as well
        if (Meteor.isClient) return; // Batch methods are not simulated on the client, just executed on the server
        const results = [];
        const errors = [];
        args.forEach((arg) => {
          try {
            const res = method._execute({ userId }, arg);
//            console.log("successful batch call", arg);
            results.push(res);
          } catch (err) {
            if (err.error === 'err_permissionDenied') throw err;  // The batch method continues exectuing even after an error. Just collects all errors on the way/            console.log("error in batch call", err);
            console.log(err);
            errors.push(err);
          }
        });
        return { errors, results };
      },
    };
    super(options);
  }
}

function hasChanges(newObj, oldObj) {
//  console.log("check change between", newObj, oldObj)
  let changed;
  _.each(newObj, (value, key) => {
    if (!_.isEqual(value, oldObj[key])) {
      changed = key;
      return false;
    }
    return true;
  });
  return changed;
}
export class BatchTester extends ValidatedMethod {
  constructor(collection) {
    const batchTesterName = collection._name + '.test.batch';
    const batchUpsertName = collection._name + '.upsert';
    const options = {
      name: batchTesterName,
      validate: batchOperationSchema.validator({ clean: true }),
      run({ args }) {
        checkPermissions(this.userId, batchUpsertName, args[0].communityId);
        if (Meteor.isClient) return; // Batch methods are not simulated on the client, just executed on the server

        const neededOperations = { insert: [], update: [], remove: [], noChange: [] };
        args.forEach((doc, i) => {
          collection.simpleSchema(doc).clean(doc);
          collection.simpleSchema(doc).validate(doc);
          const selector = {};
          collection.idSet.forEach((field) => {
            if (doc[field]) selector[field] = doc[field];
            else selector[field] = { $exists: false }; // throw new Meteor.Error('err_idFieldMissing', `Id set field ${field} must be present when performing batch operation with ${JSON.stringify(newDoc)}`);
          });
          // console.log("selector", selector);
          const existingDoc = collection.findOne(selector);
          if (!existingDoc) neededOperations.insert.push(i);
          else if (hasChanges(doc, existingDoc)) {
            neededOperations.update.push({ _id: existingDoc._id, modifier: { $set: doc } });
            // console.log(`Field ${hasChanges(doc, existingDoc)} has changed in doc: ${JSON.stringify(existingDoc)}`);
          } else neededOperations.noChange.push(i);
          // Shall we determine also what to remove?
        });
        return neededOperations;
      },
    };
    super(options);
  }
}

export class UpsertMethod extends ValidatedMethod {
  constructor(collection) {
    const upsertName = collection._name + '.upsert';
    const options = {
      name: upsertName,
      validate: doc => collection.simpleSchema(doc).validator({ clean: true })(doc),
      run(doc) {
//        console.log('Upserting:', doc);
        const communityId = doc.communityId;
        const userId = this.userId;
        checkPermissions(userId, upsertName, communityId);
        if (Meteor.isClient) return null; // Upsert methods are not simulated on the client, just executed on the server

        const selector = {};
        collection.idSet.forEach((field) => {
          if (doc[field]) selector[field] = doc[field];
          else selector[field] = { $exists: false }; // throw new Meteor.Error('err_idFieldMissing', `Id set field ${field} must be present when performing batch operation with ${JSON.stringify(newDoc)}`);
        });
//        console.log("selector", selector);
        const existingDoc = collection.findOne(selector);
        if (!existingDoc) {
//          console.log('No existing doc, so inserting', doc);
          return collection.methods.insert._execute({ userId }, doc);
        } else if (hasChanges(doc, existingDoc)) {
//          console.log(`Field ${hasChanges(doc, existingDoc)} has changed in doc:`, existingDoc);
          return collection.methods.update._execute({ userId }, { _id: existingDoc._id, modifier: { $set: doc } });
        }
        return null;
      },
    };
    super(options);
  }
}

export function crudBatchOps(collection) {
  const upsert = new UpsertMethod(collection);
  return {
    upsert,
    batch: {
//      insert: new BatchMethod(collection.methods.insert),
      update: new BatchMethod(collection.methods.update),
      remove: new BatchMethod(collection.methods.remove),
      upsert: new BatchMethod(upsert),
      test: new BatchTester(collection),
    },
  };
}
