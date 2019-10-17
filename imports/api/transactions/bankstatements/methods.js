import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '../../batch-method.js';
import { Bankstatements } from './bankstatements.js';

export const insert = new ValidatedMethod({
  name: 'bankstatements.insert',
  validate: Bankstatements.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Bankstatements._transform(doc);
    checkPermissions(this.userId, 'bankstatements.insert', doc.communityId);
    const _id = Bankstatements.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'bankstatements.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Bankstatements, _id);
//    checkModifier(doc, modifier, Bankstatements.modifiableFields);
    checkPermissions(this.userId, 'bankstatements.update', doc.communityId);

    const result = Bankstatements.update({ _id }, modifier);
    return result;
  },
});


export const remove = new ValidatedMethod({
  name: 'bankstatements.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Bankstatements, _id);
    checkPermissions(this.userId, 'bankstatements.remove', doc.communityId);

    return Bankstatements.remove(_id);
  },
});

Bankstatements.methods = Bankstatements.methods || {};
_.extend(Bankstatements.methods, { insert, update, remove });
_.extend(Bankstatements.methods, crudBatchOps(Bankstatements));
