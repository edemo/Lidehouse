import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '../../batch-method.js';
import { Bills } from '../bills/bills.js';
import { Statements } from './statements.js';

export const insert = new ValidatedMethod({
  name: 'statements.insert',
  validate: Statements.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Statements._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc);
    const _id = Statements.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'statements.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Statements, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.update', doc);

    const result = Statements.update({ _id }, modifier);
    return result;
  },
});


export const remove = new ValidatedMethod({
  name: 'statements.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Statements, _id);
    checkPermissions(this.userId, 'statements.remove', doc);

    return Statements.remove(_id);
  },
});

Statements.methods = Statements.methods || {};
_.extend(Statements.methods, { insert, update, remove });
_.extend(Statements.methods, crudBatchOps(Statements));
