import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { delegationConfirmationEmail } from '/imports/email/delegation-confirmation.js';
import { Delegations } from './delegations.js';

// User can only delegate to those who allow incoming delegations
function checkTargetUserAllowsDelegatingTo(targetPersonId, doc) {
  const targetUser = Meteor.users.findOne(targetPersonId);
  if (!targetUser) return;  // If user is not a registered user, then he allows delegation. His signature will be on the paper delegation form.
  if (!targetUser.settings.delegatee) {
    throw new Meteor.Error('err_otherPartyNotAllowed', 'Other party not allowed this activity',
      `Method: delegations, doc: {${doc}}`);
  }
}

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (this.userId !== doc.sourcePersonId) {
      // Normal user can only delegate his own votes, but special permission allows for others' as well
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
    }
    checkTargetUserAllowsDelegatingTo(doc.targetPersonId, doc);
    const delegationId = Delegations.insert(doc);
    const delegation = Delegations.findOne(delegationId);

    Delegations._transform(doc).getAffectedVotings().forEach(voting => voting.voteEvaluate(false));
    if (Meteor.isServer) { delegationConfirmationEmail(delegation, 'insert'); }
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
    checkModifier(doc, modifier, ['targetPersonId', 'scope', 'scopeObjectId']);
    if (this.userId !== doc.sourcePersonId) {
      // Normal user can only delegate his own votes, but special permission allows for others' as well
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
    }
    checkTargetUserAllowsDelegatingTo(modifier.$set.targetPersonId, doc);

    Delegations.update({ _id }, modifier);

    const oldDelegationAffects = doc.getAffectedVotings();
    const newDoc = Delegations.findOne(_id);
    const newDelegationAffects = newDoc.getAffectedVotings();
    const affectedVotings = _.uniq(_.union(oldDelegationAffects.fetch(), newDelegationAffects.fetch()), v => v._id);
    affectedVotings.forEach(voting => voting.voteEvaluate(false));
    if (Meteor.isServer) { delegationConfirmationEmail(newDoc, 'update', doc); }
  },
});

export const remove = new ValidatedMethod({
  name: 'delegations.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Delegations, _id);
    if (this.userId !== doc.sourcePersonId && this.userId !== doc.targetPersonId) {
      // User can only remove delegations that delegetes from him, or delegates to him, unless special permissions
      checkPermissions(this.userId, 'delegations.forOthers', doc.communityId);
    }

    Delegations.remove(_id);

    doc.getAffectedVotings().forEach(voting => voting.voteEvaluate(false));
    if (Meteor.isServer) { delegationConfirmationEmail(doc, 'remove'); }
  },
});

export const allow = new ValidatedMethod({
  name: 'delegations.allow',
  validate: new SimpleSchema({
    value: { type: Boolean },
  }).validator(),

  run({ value }) {
    const userId = this.userId;
    if (value === false) {
      let affectedVotings = [];
      const affectedDelegations = Delegations.find({ targetPersonId: userId }).fetch();
      affectedDelegations.forEach(delegation => affectedVotings = _.uniq(_.union(affectedVotings, delegation.getAffectedVotings().fetch()), v => v._id));
      Delegations.remove({ targetPersonId: userId });
      if (Meteor.isServer) {
        affectedDelegations.forEach(delegation => delegationConfirmationEmail(delegation, 'remove'));
      }
      affectedVotings.forEach(voting => voting.voteEvaluate(false));
    }
    Meteor.users.update(userId, { $set: { 'settings.delegatee': value } });
  },
});