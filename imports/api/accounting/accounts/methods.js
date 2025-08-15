import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Accounts } from './accounts.js';
import { Communities } from '/imports/api/communities/communities.js';

export const insert = new ValidatedMethod({
  name: 'accounts.insert',
  validate: doc => Accounts.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    checkNotExists(Accounts, { communityId: doc.communityId, code: doc.code });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Accounts.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'accounts.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    let doc = checkExists(Accounts, _id);
    const communityId = modifier.$set?.communityId || doc.communityId;
    const community = Communities.findOne(communityId);
    if (communityId !== doc.communityId) { // Editing a template entry (doc.communityId is the templlateId)
      checkConstraint(community.settings.templateId === doc.communityId, 'You can update only from your own template');
      checkPermissions(this.userId, 'accounts.update', { communityId });
      const clonedDocId = Accounts.clone(doc, communityId);
      doc = Accounts.findOne(clonedDocId);
    }
    checkPermissions(this.userId, 'accounts.update', doc);
    if (modifier.$set?.code && modifier.$set.code !== doc.code) {
      if (community.isTemplate) {
        Accounts.moveTemplate(communityId, doc.code, modifier.$set.code);
      } else {
        Accounts.move(communityId, doc.code, modifier.$set.code);
      }
      Accounts.remove({ communityId, code: modifier.$set.code });
    }

    return Accounts.update({ _id: doc._id }, modifier, { selector: { category: doc.category } });
  },
});

export const remove = new ValidatedMethod({
  name: 'accounts.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Accounts, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);
    return Accounts.remove(_id);
  },
});

Accounts.methods = Accounts.methods || {};
_.extend(Accounts.methods, { insert, update, remove });
_.extend(Accounts.methods, crudBatchOps(Accounts));
