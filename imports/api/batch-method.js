/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkPermissions } from '/imports/api/method-checks.js';

export class BatchMethod extends ValidatedMethod {
  constructor(method) {
    const batchMethodName = method.name + '.batch';
    const options = {
      name: batchMethodName,
      validate: new SimpleSchema({
        communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
        args: { type: Array },
        'args.$': { type: Object, blackbox: true },
      }).validator({ clean: true }),
      run({ communityId, args }) {
        checkPermissions(this.userId, batchMethodName, communityId);
        if (Meteor.isClient) return; // Batch methods are not simulated on the client, just executed on the server
        const results = [];
        const errors = [];
        args.forEach(arg => {
          try {
            const res = method._execute({ userId: this.userId }, arg);
            results.push(res);
          } catch (err) {   // The batch method continues exectuing even after an error. Just collects all errors on the way
            errors.push(err);
          }
        });
        return { errors, results };
      },
    };
    super(options);
  }
}
