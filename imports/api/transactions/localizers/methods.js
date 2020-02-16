import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Localizers } from './localizers.js';

export const insert = new ValidatedMethod({
  name: 'localizers.insert',
  validate: doc => Localizers.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    checkNotExists(Localizers, { communityId: doc.communityId, code: doc.code });
    checkPermissions(this.userId, 'localizers.insert', doc);

    return Localizers.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'localizers.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Localizers, _id);
    checkModifier(doc, modifier, ['code'], true);
    checkPermissions(this.userId, 'localizers.update', doc);

    Localizers.update({ _id }, modifier, { selector: { category: doc.category } });
  },
});

export const remove = new ValidatedMethod({
  name: 'localizers.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Localizers, _id);
    checkPermissions(this.userId, 'localizers.remove', doc);
    Localizers.remove(_id);
  },
});

Localizers.methods = Localizers.methods || {};
_.extend(Localizers.methods, { insert, update, remove });
