import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Bills, PaymentSchema } from './bills.js';
import { crudBatchOps } from '../../batch-method.js';

export const insert = new ValidatedMethod({
  name: 'bills.insert',
  validate: Bills.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'bills.insert', doc.communityId);
    doc = Bills._transform(doc);
    doc.outstanding = doc.calculateOutstanding();
    const _id = Bills.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'bills.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Bills, _id);
    checkModifier(doc, modifier, Bills.modifiableFields);
    checkPermissions(this.userId, 'bills.update', doc.communityId);
    Bills.update({ _id }, { $set: doc });
//    doc.outstanding = doc.calculateOutstanding();
  },
});

export const remove = new ValidatedMethod({
  name: 'bills.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Bills, _id);
    checkPermissions(this.userId, 'bills.remove', doc.communityId);
    
    Bills.remove(_id);
  },
});

Bills.methods = Bills.methods || {};
_.extend(Bills.methods, { insert, update, remove });
_.extend(Bills.methods, crudBatchOps(Bills));
