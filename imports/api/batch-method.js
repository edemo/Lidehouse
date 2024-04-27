/* eslint-disable dot-notation, max-classes-per-file */
import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
//import { PerformanceLogger } from '/imports/utils/performance-logger.js';
import { newBundledErrors } from '/imports/utils/errors.js';
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
        if (Meteor.isClient) return {}; // Batch methods are not simulated on the client, just executed on the server
//        Log.info("running batch with", args.length, ":", args[0]);
//        PerformanceLogger.startAggregation();
//        checkPermissions(userId, method.name, { communityId });  // Whoever has perm for the method, can do it in batch as well
        const results = [];
        const errors = [];
        const methodInvocation = this;
        args.forEach((arg, index) => {
          try {
            const res = method._execute(methodInvocation, arg);
//            Log.info("successful batch call", arg);
            results.push(res);
          } catch (err) {
            if (err.error === 'err_permissionDenied') throw err; // The batch method continues exectuing even after an error. Just collects all errors on the way
            Log.error(err);
            errors[index] = err;
          }
        });
//        PerformanceLogger.stopAggregation();
        if (errors.length) throw newBundledErrors(errors);
        else return results;
      },
    };
    super(options);
  }
}

function difference(oldDoc, newDoc) {
  const modifier = rusdiff.diff(oldDoc, newDoc);
  delete modifier.$unset;
  delete modifier.$rename;
  Log.debug('Difference between', oldDoc, newDoc, modifier);
  return modifier;
}

function findNonEmptySelector(collection, doc) {
  let selector;
  for (const idSet of collection.idSet) {
    selector = {};
    let emptyIdField = false;
    for (const fieldName of idSet) {
      const fieldValue = Object.getByString(doc, fieldName);
      if (_.isDefined(fieldValue)) selector[fieldName] = fieldValue;
      else {
        emptyIdField = true; // selector[fieldName] = { $exists: false }; // throw new Meteor.Error('err_idFieldMissing', `Id set field ${field} must be present when performing batch operation with ${JSON.stringify(newDoc)}`);
        break;
      }
    }
    if (!emptyIdField) return selector;
  }
  return undefined;
}
export class BatchTester extends ValidatedMethod {
  constructor(collection) {
    const batchTesterName = collection._name + '.test.batch';
    const batchUpsertName = collection._name + '.upsert';
    const options = {
      name: batchTesterName,
      validate: batchOperationSchema.validator({ clean: true }),
      run({ args }) {
        debugAssert(Meteor.isClient || Meteor.isTest); // Batch testers are only simulated on the client
        const neededOperations = { insert: [], update: [], remove: [], noChange: [] };
        if (!args.length) return neededOperations;
        checkPermissions(this.userId, batchUpsertName, { communityId: args[0].communityId });
        args.forEach((doc, i) => {
//          collection.simpleSchema(doc).clean(doc);
//          collection.simpleSchema(doc).validate(doc);
          const selector = findNonEmptySelector(collection, doc);
          if (!selector) return;
          Log.debug('selector', selector);
          const existingDoc = collection.findOne(selector);
          if (!existingDoc) neededOperations.insert.push(i);
          else {
            const modifier = difference(existingDoc, doc);
            if (!_.isEmpty(modifier)) {
              neededOperations.update.push({ _id: existingDoc._id, modifier });
              // Log.debug(`Field ${hasChanges(doc, existingDoc)} has changed in doc: ${JSON.stringify(existingDoc)}`);
            } else neededOperations.noChange.push(i);
            // Shall we determine also what to remove?
          }
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
      validate: null, // doc => collection.simpleSchema(doc).validator({ clean: true })(doc),
                      // cannot validate here - that causes defaultvalues to be addded, which cause differing
      run(doc) {
        Log.info('Upserting:', doc);
        const communityId = doc.communityId;
        const userId = this.userId;
        const methodInvocation = this;
        checkPermissions(userId, upsertName, { communityId });
        if (Meteor.isClient) return null; // Upsert methods are not simulated on the client, just executed on the server
        const selector = findNonEmptySelector(collection, doc);
        if (!selector) return null;
        Log.debug('selector', selector);
        const existingDoc = collection.findOne(selector);
        if (!existingDoc) {
          Log.info('No existing doc, so inserting', doc);
          return collection.methods.insert._execute(methodInvocation, doc);
        } else {
          const modifier = difference(existingDoc, doc);
          if (!_.isEmpty(modifier)) {
            return collection.methods.update._execute(methodInvocation, { _id: existingDoc._id, modifier });
          }
          return null;
        }
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
