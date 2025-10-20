import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Buckets } from './buckets.js';
import { Communities } from '/imports/api/communities/communities.js';

export const insert = new ValidatedMethod({
  name: 'buckets.insert',
  validate: doc => Buckets.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    checkNotExists(Buckets, { communityId: doc.communityId, code: doc.code });
    checkPermissions(this.userId, 'buckets.insert', doc);

    return Buckets.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'buckets.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    let doc = checkExists(Buckets, _id);
    const communityId = modifier.$set?.communityId || doc.communityId;
    const community = Communities.findOne(communityId);
    if (communityId !== doc.communityId) { // Editing a template entry (doc.communityId is the templlateId)
      checkConstraint(community.settings.templateId === doc.communityId, 'You can update only from your own template');
      checkPermissions(this.userId, 'buckets.update', { communityId });
      const clonedDocId = Buckets.clone(doc, communityId);
      doc = Buckets.findOne(clonedDocId);
    }
    checkPermissions(this.userId, 'buckets.update', doc);
    if (modifier.$set?.code && modifier.$set.code !== doc.code) {
      if (community.isTemplate) {
        Buckets.moveTemplate(communityId, doc.code, modifier.$set.code);
      } else {
        Buckets.move(communityId, doc.code, modifier.$set.code);
      }
      Buckets.remove({ communityId, code: modifier.$set.code });
    }

    return Buckets.update({ _id: doc._id }, modifier );
  },
});

export const remove = new ValidatedMethod({
  name: 'buckets.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Buckets, _id);
    checkPermissions(this.userId, 'buckets.remove', doc);
    return Buckets.remove(_id);
  },
});

Buckets.methods = Buckets.methods || {};
_.extend(Buckets.methods, { insert, update, remove });
_.extend(Buckets.methods, crudBatchOps(Buckets));
