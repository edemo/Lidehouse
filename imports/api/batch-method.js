/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkPermissions } from '/imports/api/method-checks.js';

const batchOperationSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  args: { type: Array },
  'args.$': { type: Object, blackbox: true },
});

export class BatchMethod extends ValidatedMethod {
  constructor(method) {
    const batchMethodName = method.name + '.batch';
    const options = {
      name: batchMethodName,
      validate: batchOperationSchema.validator({ clean: true }),
      run({ communityId, args }) {
//        console.log("running batch for", args.length);
        checkPermissions(this.userId, batchMethodName, communityId);
        if (Meteor.isClient) return; // Batch methods are not simulated on the client, just executed on the server
        const results = [];
        const errors = [];
        args.forEach(arg => {
          try {
            const res = method._execute({ userId: this.userId }, arg);
//            console.log("successful batch call", arg);
            results.push(res);
          } catch (err) {   // The batch method continues exectuing even after an error. Just collects all errors on the way
//            console.log("error in batch call", err);
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
    const batchMethodName = collection._name + '.insert.batch';
    const options = {
      name: batchTesterName,
      validate: batchOperationSchema.validator({ clean: true }),
      run({ communityId, args }) {
        checkPermissions(this.userId, batchMethodName, communityId);
        if (Meteor.isClient) return; // Batch methods are not simulated on the client, just executed on the server

        const neededOperations = { insert: [], update: [], remove: [], noChange: [] };
        args.forEach(newDoc => {
          newDoc.communityId = communityId;
          const selector = {};
          collection.idSet.forEach(field => {
            if (!newDoc[field]) selector[field] = { $exists: false }; // throw new Meteor.Error('err_idFieldMissing', `Id set field ${field} must be present when performing batch operation with ${JSON.stringify(newDoc)}`);
            selector[field] = newDoc[field];
          });
//          console.log("selector", selector);
          const existingDoc = collection.findOne(selector);
          if (!existingDoc) neededOperations.insert.push(newDoc);
          else if (hasChanges(newDoc, existingDoc)) {
            neededOperations.update.push({ _id: existingDoc._id, modifier: { $set: newDoc } });
//            console.log(`Field ${hasChanges(newDoc, existingDoc)} has changed`);
          } else neededOperations.noChange.push(newDoc);
          // Shall we determine also what to remove?
        });
        return neededOperations;
      },
    };
    super(options);
  }
}

export function crudBatchOps(collection) {
  return {
    batch: {
      insert: new BatchMethod(collection.methods.insert),
      update: new BatchMethod(collection.methods.update),
      remove: new BatchMethod(collection.methods.remove),
      test: new BatchTester(collection),
    },
  };
}
