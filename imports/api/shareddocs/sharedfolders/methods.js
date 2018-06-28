import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { checkLoggedIn, checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'sharedfolders.insert',
  validate: Sharedfolders.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Sharedfolders, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'shareddocs.upload', doc.communityId);

    return Sharedfolders.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'sharedfolders.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Sharedfolders, _id);
    checkModifier(doc, modifier, ['name']);
    checkNotExists(Sharedfolders, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'shareddocs.upload', doc.communityId); 

    Sharedfolders.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'sharedfolders.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Sharedfolders, _id);
    checkPermissions(this.userId, 'shareddocs.upload', doc.communityId);

    Sharedfolders.remove(_id);
  },
});
