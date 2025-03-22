import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Random } from 'meteor/random';
import { Accounts as UserAccounts } from 'meteor/accounts-base';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';

import { Log } from '/imports/utils/log.js';
import { officerRoles } from '/imports/api/permissions/roles.js';
import { checkRegisteredUser, checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { __ } from '/imports/localization/i18n.js';
import { sendPromoLaunchLink, sendPromoInviteLink } from '/imports/email/promo-send.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { AccountingPeriods } from '/imports/api/transactions/periods/accounting-periods.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Statements } from '/imports/api/transactions/statements/statements.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Communities } from './communities.js';

export const create = new ValidatedMethod({
  name: 'communities.insert',
  validate: Communities.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkRegisteredUser(this.userId);
    checkNotExists(Communities, { name: doc.name });
    const communityId = Communities.insert(doc);

    // The user creating the community, becomes the first 'admin' of it.
    Memberships.insert({ communityId, userId: this.userId, role: 'admin', approved: true, accepted: true });
    return communityId;
  },
});

const launchMail = new ValidatedMethod({
  name: 'communities.launchMail',
  validate: new SimpleSchema({
    community: { type: Object },
    'community.name': { type: String },
    'community.settings': { type: Object },
    'community.settings.language': { type: String },
    admin: { type: Object },
    'admin.email': { type: String },
    parcelCount: { type: Number },
    promoCode: { type: String },
  }).validator({ clean: true }),

  run(params) {
    if (Meteor.isServer) sendPromoLaunchLink(params);
  },
});

const launch = new ValidatedMethod({
  name: 'communities.launch',
  validate: new SimpleSchema({
    community: { type: Communities.simpleSchema() },
    admin: { type: Object },
    'admin.email': { type: String },
    promoCode: { type: String },
  }).validator({ clean: true }),

  run({ community, admin, promoCode }) {
    if (!Meteor.isServer) return '#';
    if (UserAccounts.findUserByEmail(admin.email)) {  // cannot create 2 sandboxes, to avoid duplicate launch of community
      return FlowRouterHelpers.urlFor('Board');
    }

    const communityId = Communities.insert(community);
    const communityDoc = Communities.findOne(communityId);
    const language = community.settings.language;
    Log.info(`Sandbox community ${community.name}(${communityId}) created by ${admin.email}}`);
    const userId = UserAccounts.createUser({ email: admin.email, password: Random.id(8), language });
    const { token } = UserAccounts.generateResetToken(userId, admin.email, 'enrollAccount', {});
    const enrollUrl = UserAccounts.urls.enrollAccount(token);

    Memberships.insert({ communityId, userId, role: 'admin', approved: true, accepted: true });
    const type = TAPi18n.__('schemaParcels.type.flat', {}, language);
    const parcelId = Parcels.insert({ communityId, category: communityDoc.propertyCategory(), approved: true, serial: 1, ref: 'A001', units: 100, type });
    Memberships.insert({ communityId, userId, parcelId, approved: true, accepted: true,
      role: 'owner', ownership: { share: new Fraction(1) },
    });
    const lang = community.settings.language;
    const voting = {
      title: __('demo.vote.promo.title', {}, lang),
      text: __('demo.vote.promo.text', {}, lang),
      category: 'vote',
      status: 'opened',
      createdAt: moment().toDate(),
      closesAt: moment().add(2, 'weeks').toDate(),
      vote: {
        procedure: 'online',
        effect: 'poll',
        type: 'choose',
        choices: [
          __('demo.vote.promo.choice.0', {}, lang),
          __('demo.vote.promo.choice.1', {}, lang),
          __('demo.vote.promo.choice.2', {}, lang),
        ],
      },
    };
    const votingId = Topics.insert(_.extend(voting, { communityId }));
    if (Meteor.isServer) Topics.direct.update(votingId, { $set: { creatorId: userId } }, { selector: { category: 'vote' } });
    updateMyLastSeen._execute({ userId }, { topicId: votingId, lastSeenInfo: { timestamp: new Date() } });

    const user = Meteor.users.findOne(userId);  // this.userId is undefined
    if (Meteor.isServer) sendPromoInviteLink(user, communityDoc);

    return enrollUrl;
  },
});

export const update = new ValidatedMethod({
  name: 'communities.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Communities, _id);
    // checkModifier(doc, modifier, ['lot'], true);     // all fields are modifiable except lot
    checkPermissions(this.userId, 'communities.update', doc);
    Communities.update({ _id }, modifier);
  },
});

export const close = new ValidatedMethod({
  name: 'communities.close',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Communities, _id);
    checkPermissions(this.userId, 'communities.update', doc);
    const modifier = { $set: { status: 'closed' } };
    Communities.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'communities.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Communities, _id);
    const communityId = _id;
    checkPermissions(this.userId, 'communities.remove', doc);
    // Community cannot be deleted while it has any active officers apart from the admin
    const officers = Memberships.findActive({ communityId, role: { $in: officerRoles } });
    if (officers.count() > 1) {
      throw new Meteor.Error('err_unableToRemove',
      'Community cannot be deleted while it has active officers', `Found: {${officers.count()}}`);
    }
    // Once there are no active officers, the community can be purged
    Meters.remove({ communityId });
    Attachments.remove({ communityId });
    Shareddocs.remove({ communityId });  // permission check in package before hook - needs membership
    Memberships.remove({ communityId });
    Comments.remove({ communityId });
    Topics.remove({ communityId });
    Agendas.remove({ communityId });
    Delegations.remove({ communityId });
    Transactions.remove({ communityId });
    ParcelBillings.remove({ communityId });
    Balances.remove({ communityId });
    Statements.remove({ communityId });
    StatementEntries.remove({ communityId });
    Txdefs.remove({ communityId });
    Parcels.remove({ communityId });
    Partners.remove({ communityId });
    Contracts.remove({ communityId });
    Accounts.remove({ communityId });
    Breakdowns.remove({ communityId });
    AccountingPeriods.remove({ communityId });
    Sharedfolders.remove({ communityId });
    Communities.remove(communityId);
  },
});

Communities.methods = Communities.methods || {};
_.extend(Communities.methods, { create, launch, update, close, remove });
