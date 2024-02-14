import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier, checkConstraint } from '/imports/api/method-checks.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';

export const insert = new ValidatedMethod({
  name: 'txdefs.insert',
  validate: Txdefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Txdefs, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Txdefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txdefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    let doc = checkExists(Txdefs, _id);
    if (doc.communityId !== modifier.$set.communityId) {
      const community = Communities.findOne(modifier.$set.communityId);
      checkConstraint(community.settings.templateId === doc.communityId, 'You can update only from your own template');
      checkPermissions(this.userId, 'accounts.update', { communityId: modifier.$set.communityId });
      const clonedDocId = Txdefs.clone(doc, modifier.$set.communityId);
      doc = Txdefs.findOne(clonedDocId);
    }
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other accounts
    checkNotExists(Txdefs, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkNotExists(Transactions, { communityId: doc.communityId, defId: _id }); // TODO: Need to move those transactions firsst
    checkPermissions(this.userId, 'accounts.update', doc);

    return Txdefs.update({ _id: doc._id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'txdefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Txdefs, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);
    checkNotExists(Transactions, { communityId: doc.communityId, defId: _id }); // TODO: Need to move those transactions firsst

    return Txdefs.remove(_id);
  },
});

Txdefs.methods = Txdefs.methods || {};
_.extend(Txdefs.methods, { insert, update, remove });
