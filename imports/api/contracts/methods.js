import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Topics } from '/imports/api/topics/topics.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { checkLoggedIn, checkExists, checkNotExists, checkPermissions, checkModifier } from '../method-checks.js';

export const insert = new ValidatedMethod({
  name: 'contracts.insert',
  validate: Contracts.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'contracts.insert', doc.communityId);

    return Contracts.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'contracts.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Contracts, _id);
    checkModifier(doc, modifier, ['title', 'text', 'partner']);
    checkPermissions(this.userId, 'contracts.update', doc.communityId);

    Contracts.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'contracts.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Contracts, _id);
    checkPermissions(this.userId, 'contracts.remove', doc.communityId);
    const worksheets = doc.worksheets();
    if (worksheets.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Contract cannot be deleted while it contains worksheets',
       `Found: {${worksheets.count()}}`);
    }
    Contracts.remove(_id);
  },
});

Contracts.methods = Contracts.methods || {};
_.extend(Contracts.methods, { insert, update, remove });
