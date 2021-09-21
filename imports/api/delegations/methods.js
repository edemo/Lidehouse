import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { delegationConfirmationEmail } from '/imports/email/delegation-confirmation.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Delegations } from './delegations.js';

// User can only delegate to those who allow incoming delegations
function checkTargetUserAllowsDelegatingTo(targetId, doc) {
  const targetUser = Partners.findOne(targetId).user();
  if (!targetUser) return;  // If user is not a registered user, then he allows delegation. His signature will be on the paper delegation form.
  if (!targetUser.settings.delegatee) {
    throw new Meteor.Error('err_otherPartyNotAllowed', 'Other party not allowed this activity',
      `Method: delegations, doc: {${doc}}`);
  }
}

function checkNoSelfDelegation(doc, modifierSet) {
  if (doc.targetId === doc.sourceId || (modifierSet && (modifierSet.targetId === modifierSet.sourceId || modifierSet.targetId === doc.sourceId))) {
    throw new Meteor.Error('err_sanityCheckFailed', 'You can not delegate to yourself');
  }
}

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Delegations._transform(doc);
    if (this.userId !== doc.sourceUserId()) {
      // Normal user can only delegate his own votes, but special permission allows for others' as well
      checkPermissions(this.userId, 'delegations.forOthers', doc);
    }
    checkTargetUserAllowsDelegatingTo(doc.targetId, doc);
    checkNoSelfDelegation(doc);
    const delegationId = Delegations.insert(doc);
    const delegation = Delegations.findOne(delegationId); // Refetch needed for timestamps and helper methods

    if (Meteor.isServer) {
      delegation.getAffectedOpenVotings().forEach(voting => voting.voteEvaluate());
      delegationConfirmationEmail(delegation, 'insert');
    }

    return delegationId;
  },
});

export const update = new ValidatedMethod({
  name: 'delegations.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Delegations, _id);
    checkModifier(doc, modifier, ['targetId', 'scope', 'scopeObjectId']);
    if (this.userId !== doc.sourceUserId()) {
      // Normal user can only delegate his own votes, but special permission allows for others' as well
      checkPermissions(this.userId, 'delegations.forOthers', doc);
    }
    checkTargetUserAllowsDelegatingTo(modifier.$set.targetId, doc);
    checkNoSelfDelegation(doc, modifier.$set);

    Delegations.update({ _id }, modifier);

    if (Meteor.isServer) {
      const oldDelegationAffects = doc.getAffectedOpenVotings();
      const newDoc = Delegations.findOne(_id);
      const newDelegationAffects = newDoc.getAffectedOpenVotings();
      const affectedOpenVotings = _.uniq(_.union(oldDelegationAffects, newDelegationAffects), v => v._id);
      affectedOpenVotings.forEach(voting => voting.voteEvaluate());

      delegationConfirmationEmail(newDoc, 'update', doc);
    }
  },
});

export const remove = new ValidatedMethod({
  name: 'delegations.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Delegations, _id);
    if (this.userId !== doc.sourceUserId() && this.userId !== doc.targetUserId()) {
      // User can only remove delegations that delegetes from him, or delegates to him, unless special permissions
      checkPermissions(this.userId, 'delegations.forOthers', doc);
    }

    Delegations.remove(_id);

    if (Meteor.isServer) {
      doc.getAffectedOpenVotings().forEach(voting => voting.voteEvaluate());
      delegationConfirmationEmail(doc, 'remove');
    }
  },
});

export const allow = new ValidatedMethod({
  name: 'delegations.allow',
  validate: new SimpleSchema({
    value: { type: Boolean },
  }).validator(),

  run({ value }) {
    const userId = this.userId;
    const user = Meteor.users.findOne(userId);
    if (value === false) {
      let affectedVotings = [];
      const affectedDelegations = Delegations.find({ targetId: { $in: user.partnerIds() } }).fetch();
      affectedDelegations.forEach(delegation => affectedVotings = _.uniq(_.union(affectedVotings, delegation.getAffectedOpenVotings()), v => v._id));
      Delegations.remove({ targetId: { $in: user.partnerIds() } });
      if (Meteor.isServer) {
        affectedVotings.forEach(voting => voting.voteEvaluate());
        affectedDelegations.forEach(delegation => delegationConfirmationEmail(delegation, 'remove'));
      }
    }
    Meteor.users.update(userId, { $set: { 'settings.delegatee': value } });
  },
});

Delegations.methods = Delegations.methods || {};
_.extend(Delegations.methods, { insert, update, remove, allow });
