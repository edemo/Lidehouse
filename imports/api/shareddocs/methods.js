import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { checkExists, checkNotExists, checkPermissionsToUpload, checkPermissionsToRemoveUploaded, checkModifier } from '/imports/api/method-checks.js';

export const update = new ValidatedMethod({
  name: 'shareddocs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Shareddocs, _id);
    checkModifier(doc, modifier, ['folderId']);
    checkNotExists(Shareddocs, { _id: { $ne: doc._id }, communityId: doc.communityId, folderId: modifier.$set.folderId, name: doc.name });
    checkPermissionsToUpload(this.userId, Shareddocs, doc);

    Shareddocs.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'shareddocs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Shareddocs, _id);
    checkPermissionsToRemoveUploaded(this.userId, Shareddocs, doc);

    Shareddocs.remove(_id);
  },
});

export function cleanCanceledVoteAttachments() {
  Shareddocs.remove({ topicId: { $exists: true }, $where: 'this.topicId === this.userId' });  // jalik-ufs puts userId as creatorId
  // Using $expr would be faster, but only mongo 3.6 supports it (and currently we are on 3.4)
  // Shareddocs.remove({ $expr: { $eq: ['$topicId', '$userId'] } });
}

Shareddocs.methods = Shareddocs.methods || {};
_.extend(Shareddocs.methods, { /* insert,*/ update, remove });
