import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

function checkExternalUrl(externalUrl) {
  if (!externalUrl) return;
  const split = externalUrl.split('/');
  const folderId = _.last(split).split('?')[0];
  if (split[2] !== 'drive.google.com' || folderId.length !== 33) {
    throw new Meteor.Error('err_invalidData', 'Not a valid google drive link');
  }
}

export const insert = new ValidatedMethod({
  name: 'sharedfolders.insert',
  validate: Sharedfolders.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Sharedfolders, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'shareddocs.upload', doc);
    checkExternalUrl(doc.externalUrl);

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
//    checkModifier(doc, modifier, ['name', 'externalUrl']);
    checkNotExists(Sharedfolders, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'shareddocs.upload', doc);
    checkExternalUrl(modifier.$set?.externalUrl);

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
    checkPermissions(this.userId, 'shareddocs.upload', doc);

    Shareddocs.remove({ communityId: doc.communityId, folderId: _id });
    Sharedfolders.remove(_id);
  },
});

Sharedfolders.methods = Sharedfolders.methods || {};
_.extend(Sharedfolders.methods, { insert, update, remove });
