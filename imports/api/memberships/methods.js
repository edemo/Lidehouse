import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';

import { checkExists, checkModifier, checkAddMemberPermissions } from '/imports/api/method-checks.js';
import { Memberships } from './memberships.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    if (doc.role === 'owner') {
      const total = Parcels.findOne({ _id: doc.parcelId }).ownedShare();
      const newTotal = total.add(doc.ownership.share);
      if (newTotal.numerator > newTotal.denominator) {
        throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1',
          `Old total: ${total}, New total: ${newTotal}`);
      }
    };
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
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    checkModifier(doc, modifier, ['userId', 'role', 'ownership.share', 'ownership.representor', 'benefactorship.type']);
    const newrole = modifier.$set.role;
    if (newrole && newrole !== doc.role) {
      checkAddMemberPermissions(this.userId, doc.communityId, newrole);
    }
    if (doc.role === 'owner') {
      const total = Parcels.findOne({ _id: doc.parcelId }).ownedShare();
      const newTotal = total.subtract(doc.ownership.share).add(modifier.$set['ownership.share']);
      if (newTotal.numerator > newTotal.denominator) {
        throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1',
          `Old total: ${total}, New total: ${newTotal}`);
      }
    };
    Memberships.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'memberships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    Memberships.remove(_id);
  },
});
