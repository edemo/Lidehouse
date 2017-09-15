import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';

import { checkAddMemberPermissions } from '/imports/api/method-utils.js';
import { Memberships } from './memberships.js';

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    if (doc.role === 'owner') {
      let total = 0;
      Memberships.find({ parcelId: doc.parcelId }).forEach(p => total += p.ownership.share.toNumber());
      const newTotal = total + doc.ownership.share;
      if (!(newTotal <= 1)) {
        throw new Meteor.Error('err_sanityCheckFailed', 'Value does not make sense.',
          `Old total: ${total}, New total: ${newTotal}`);
      }
    }
    return Memberships.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'memberships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    Memberships.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'memberships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = Memberships.findOne(_id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    Memberships.remove(_id);
  },
});
