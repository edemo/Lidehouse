import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';

import { Log } from '/imports/utils/log.js';
import { checkExists, checkModifier, checkAddMemberPermissions } from '/imports/api/method-checks.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from './memberships.js';

// We need a check of userEmail and userId matches.
// Easy solution is to not allow setting both fields in inserts and updates. Eg. userId will be the stronger.
// Alternatively we could throw an Error if they dont match.
function checkUserDataConsistency(membership) {
  if (membership.userId) {
    if (membership.userEmail) {
      Log.warning('Membership data contains both userId and userEmail', membership);
      delete membership.userEmail;
    }
  }
}

// Connecting the membership with a registered user (call if only email is provided and no user connected)
// from this point the user can change her email address, w/o breaking the association
export function connectUser(membershipId, userId) {
  const modifier = {
    $set: { userId },
    $unset: { userEmail: '' },      // !! break the email association - the userId is the new association
  };
  Memberships.update(membershipId, modifier);
}

// Sends out an invitation into the specific community to the provided email address
function inviteUser(membershipId, email) {
  const membership = Memberships.findOne(membershipId);
  // TODO:
  /*
  Dear user,
  You have been added as a member of community '${membership.community()}', with role: ${membership.role}
  If you think you have been added by accident, or in fact not want to be part of that community,
  please contact the community administrator at ${admin.email}, and ask him to remove you.

  You have been also invited to join the condominium management system, where you can follow the community issues,
  discuss them and even vote on them. You can start enjoying all its benefits as soon as you redister your account
  with this email address.
  The following link takes you to our simple one click registration: LINK
  */
  Log.info(`Invitation sent to ${email}, to join community ${membership.community().name}`);
  // When user joins, with this email, she will automatically get connected to this membership
  return;
}

// Sometimes only a email is given in the membership. In this case we can look if we have a registered user with such email,
// and then connect her to this membership. Or if not, we can send invitation to this email.
function connectUserIfPossible(membershipId) {
  const membership = Memberships.findOne(membershipId);
  const email = membership.userEmail;
  if (!membership.userId && email) {
    const user = Meteor.users.findOne({ 'emails.0.address': email });
    if (user && user.emails[0].verified) {  // if not verified, connection will happen when she verifies (thats the trigger)
      connectUser(membership._id, user._id);
    } else {
      inviteUser(membership._id, email);
    }
  }
}

function checkSanityOfTotalShare(parcelId, totalShare) {
  if (totalShare.numerator > totalShare.denominator) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1',
      `New total shares would become: ${totalShare}, for parcel ${parcelId}`);
  }
}

export const connectMe = new ValidatedMethod({
  name: 'memberships.connectMe',
  validate: null,

  run() {
    const email = Meteor.users.findOne(this.userId).emails[0].address;
    const userId = this.userId;
    Memberships.find({ userEmail: email }).forEach((membership) => {
      connectUser(membership._id, userId);
    });
  },
});

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    if (doc.role === 'owner') {
      const total = Parcels.findOne({ _id: doc.parcelId }).ownedShare();
      const newTotal = total.add(doc.ownership.share);
      checkSanityOfTotalShare(doc.parcelId, newTotal);
    }
    checkUserDataConsistency(doc);
    const id = Memberships.insert(doc);
    connectUserIfPossible(id);
    return id;
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
    checkModifier(doc, modifier, Memberships.modifiableFields);
    const newrole = modifier.$set.role;
    if (newrole && newrole !== doc.role) {
      checkAddMemberPermissions(this.userId, doc.communityId, newrole);
    }
    if (doc.role === 'owner') {
      const total = Parcels.findOne({ _id: doc.parcelId }).ownedShare();
      const newTotal = total.subtract(doc.ownership.share).add(modifier.$set['ownership.share']);
      checkSanityOfTotalShare(doc.parcelId, newTotal);
    }
    checkUserDataConsistency(modifier.$set);
    Memberships.update({ _id }, modifier);
    connectUserIfPossible(_id);
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
