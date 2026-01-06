import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { sanityCheckAtLeastOneActive } from '/imports/api/behaviours/active-period.js';
import { Log } from '/imports/utils/log.js';
import { checkExists, checkNotExists, checkModifier } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships, entityOf } from './memberships.js';
import { sendAddedToRoleInfoEmail } from '/imports/email/added-to-role.js';

function checkAddMemberPermissions(userId, communityId, roleOfNewMember) {
  // Checks that *user* has permission to add new member in given *community*  
  const user = Meteor.users.findOne(userId);
  if (roleOfNewMember === 'guest') return;  // TODO: who can join as guest? or only in Demo house?)
  const permissionName = entityOf(roleOfNewMember) + '.update';
  if (!user.hasPermission(permissionName, { communityId })) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to add membership', { roleOfNewMember, userId, communityId });
  }
}

function checkParcelMembershipsSanity(parcelId, memberships) {
  if (Meteor.isClient) return;
  if (!parcelId) return;
  const parcel = Parcels.findOne(parcelId);
  // Parcel can have only one representor
  const representorsCount = memberships.find({ communityId: parcel.communityId, active: true, approved: true, parcelId, role: 'owner', 'ownership.representor': true }).length;
  if (representorsCount > 1) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Parcel can have only one representor', { representorsCount, parcel: parcel._id });
  }
  // Ownership share cannot exceed 1
  let ownedShare = new Fraction(0);
  memberships.find({ parcelId, active: true, approved: true, role: 'owner' })
    .forEach(p => ownedShare = ownedShare.add(p.ownership.share));
  if (ownedShare.numerator > ownedShare.denominator) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1', { ownedShare, parcel: parcel._id });
  }
  // Following check is not good, if we have activePeriods (same guy can have same role at a different time)
  // checkNotExists(Memberships, { communityId: doc.communityId, role: doc.role, parcelId: doc.parcelId, partnerId: doc.partnerId });
}

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: doc => Memberships.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    doc = Memberships._transform(doc);
    // Users can submit non-approved membership requests, just for themselves
    if (!doc.approved) {
      if (doc.userId && doc.userId !== this.userId) {
        throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity', { method: 'memberships.insert', doc, userId: this.userId });
      }
      // Nothing else to check. Things will be checked when it gets approved by community admin/manager.
      if (doc.community() && !doc.community().needsJoinApproval()) {
        doc.approved = true;
        doc.accepted = true;
      }
    } else {
      checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    }

    const MembershipsStage = Memberships.Stage();
    const _id = MembershipsStage.insert(doc);
    checkParcelMembershipsSanity(doc.parcelId, MembershipsStage);
    MembershipsStage.commit();

    return _id;
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
    checkModifier(doc, modifier, Memberships.modifiableFields.concat('approved'));

    const MembershipsStage = Memberships.Stage();
    const result = MembershipsStage.update({ _id }, modifier, { selector: doc });
    checkParcelMembershipsSanity(doc.parcelId, MembershipsStage);
    MembershipsStage.commit();

    return result;
  },
});

export const linkUser = new ValidatedMethod({
  name: 'memberships.linkUser',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    const partner = doc.partner();
    const email = partner && partner.contact && partner.contact.email;
    if (!email && !doc.userId) throw new Meteor.Error('err_sanityCheckFailed', 'No contact email set for this partner', doc);
    if (this.isSimulation) return;  // Not possible to find and link users on the client side, as no user data available

    if (doc.userId) {
      const linkedUser = Meteor.users.findOne(doc.userId);
      if (linkedUser.isVerified() === false) {
        // Lets resend the enrollment request
        Accounts.sendEnrollmentEmail(doc.userId);
      } else if (doc.accepted === false) {
        Memberships.update(doc._id, { $set: { accepted: true } }, { selector: { role: doc.role } });
        sendAddedToRoleInfoEmail(linkedUser, doc.communityId, doc.role);
       // now we auto-accept it for him (if he is already verified user), we could send acceptance request email instead of info
      }
      return;   // thats all, user is already linked
    }

    // Else if doc.userId is not yet set, we link user here
    let user = Meteor.users.findOne({ 'emails.0.address': email });
    if (user && Partners.findOne({ communityId: doc.communityId, _id: { $ne: doc.partnerId }, userId: user._id })) {
      throw new Meteor.Error('err_sanityCheckFailed', 'There is already an other partner connected with a user with this e-mail address in the community');
    }
    if (!user) {
      const inviter = Meteor.users.findOne(this.userId);
      Log.info(`Invitation sending to ${email} in '${inviter.language()}', to join community ${doc.community().name}`);
      const userId = Accounts.createUser({ email, password: Random.id(8), language: inviter.language() });
      Accounts.sendEnrollmentEmail(userId);
      user = Meteor.users.findOne(userId);
    }

    // TODO: We should ask for acceptance, not auto-accept it like now
    const accepted = user.isVerified(); // if not verified, auto-acceptance will happen when he verifies
    if (!partner.userId) Partners.update(doc.partnerId, { $set: { userId: user._id } });
    Memberships.update(doc._id, { $set: { accepted } }, { selector: { role: doc.role } });
  },
});

export const accept = new ValidatedMethod({
  name: 'memberships.accept',
  validate: null,
  run() {
    Memberships.find({ userId: this.userId }).forEach((doc) => {
      Memberships.update(doc._id, { $set: { accepted: true } }, { selector: { role: doc.role } });
    });
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
    if (doc.contract()) {
      throw new Meteor.Error('err_unableToRemove', 'Membership cannot be deleted while it has a corresponding contract, please delete the contract first');
    }
    const MembershipsStage = Memberships.Stage();
    const result = MembershipsStage.remove(_id);
    if (doc.role === 'admin') {
      try {
        sanityCheckAtLeastOneActive(MembershipsStage, { communityId: doc.communityId, role: 'admin' });
      } catch (err) {
        throw new Meteor.Error('err_unableToRemove', 'Admin cannot be deleted if no other admin is appointed');
      }
    }
    MembershipsStage.commit();
    return result;
  },
});

Memberships.methods = Memberships.methods || {};
_.extend(Memberships.methods, { insert, update, linkUser, accept, remove });
_.extend(Memberships.methods, crudBatchOps(Memberships));
