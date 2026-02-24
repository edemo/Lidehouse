import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Random } from 'meteor/random';
import { Accounts as UserAccounts } from 'meteor/accounts-base';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';
import { Fraction } from 'fractional';

import { Log } from '/imports/utils/log.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { officerRoles } from '/imports/api/permissions/roles.js';
import { checkRegisteredUser, checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { __ } from '/imports/localization/i18n.js';
import { sendPromoLaunchLink, sendPromoInviteLink } from '/imports/email/promo-send.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Partners } from '/imports/api/partners/partners.js';
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
    return Communities.update({ _id }, modifier);
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
    return Communities.update({ _id }, modifier);
  },
});

const userDataCollectionNames = [ 
  'notifications',
];
  
const communityDataCollectionNames = [ 
  // in deletion order
  'meterReadings',
  'meters',
  'attachments',
  'shareddocs',
  'memberships',
  'comments',
  'topics',
  'agendas',
  'delegations',
  'transactions',
  'parcelBillings',
  'balances',
  'statementEntries',
  'statements',
  'txdefs',
  'parcels',
  'partners',
  'contracts',
  'accounts',
  'breakdowns',
  'accountingPeriods',
  'sharedfolders',
  'settings',
  'recognitions',
  'reviews',
  'deals',
  'listings',
];

export const remove = new ValidatedMethod({
  name: 'communities.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    force: { type: Boolean, optional: true }
  }).validator(),
  run({ _id, force }) {
    const doc = checkExists(Communities, _id);
    const communityId = _id;
    checkPermissions(this.userId, 'communities.remove', doc);
    // Community cannot be deleted while it has any active officers apart from the admin
    const officers = Memberships.findActive({ communityId, role: { $in: officerRoles } });
    if (!force && officers.count() > 1) {
      throw new Meteor.Error('err_unableToRemove',
      'Community cannot be deleted while it has active officers', `Found: {${officers.count()}}`);
    }
    // Once there are no active officers, the community can be purged
    communityDataCollectionNames.forEach(name => {
      collection = Mongo.Collection.get(name);
      collection.remove({ communityId });
    });
    return Communities.remove(communityId);
  },
});

export const zip = new ValidatedMethod({
  name: 'communities.zip',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    withUploadedData: { type: Boolean, defaultValue: false },
  }).validator({ clean: true }),
  run({ _id, withUploadedData }) {
    const communityId = _id;
    const doc = checkExists(Communities, _id);
    const user = Meteor.users.findOne(this.userId);
    if (!user.super) return;
    if (Meteor.isClient) return;

    const result = {
      communities: [doc],
    };
    communityDataCollectionNames.forEach(name => {
      collection = Mongo.Collection.get(name);
      debugAssert(collection, `Could not find collection ${name}`);
      result[name] = collection.find({ communityId }).fetch();
    });
    const partners = Partners.find({ communityId }).fetch();
    const userIds = _.without(_.uniq(_.pluck(partners, 'userId')), undefined);
    result.users = Meteor.users.find({ _id: { $in: userIds } }).fetch();
    
    userDataCollectionNames.forEach(name => {
      collection = Mongo.Collection.get(name);
      debugAssert(collection, `Could not find collection ${name}`);
      result[name] = collection.find({ userId: { $in: userIds } }).fetch();
    });
    if (withUploadedData) { // bringing the uploaded file chunks - TODO
      result['uploadfs.files'] = [];
      result['uploadfs.chunks'] = [];
      const db = Communities.rawDatabase();
      const filesColl = db.collection('uploadfs.files'); debugAssert(filesColl, `Could not find collection ${'uploadfs.files'}`);
      const chunksColl = db.collection('uploadfs.chunks'); debugAssert(chunksColl, `Could not find collection ${'uploadfs.chunks'}`);
      result.shareddocs.forEach(shareddoc => {
        // TODO: async operation needed here
        filesColl.find({ filename: shareddoc._id }).toArray((err, docs) => {
          result['uploadfs.files'].push(...docs);
        })
        chunksColl.find({ files_id: shareddoc._id }).toArray((err, docs) => {
          result['uploadfs.chunks'].push(...docs);
        })
      });
    }
    return result;
  },
});

export const unzip = new ValidatedMethod({
  name: 'communities.unzip',
  validate: new SimpleSchema({
    data: { type: Object, blackbox: true },
  }).validator(),
  run({ data }) {
    productionAssert(data.communities.length === 1, "Multi communities export not supprted", data.communities);
    const community = data.communities[0];
    checkNotExists(Communities, community._id);
    const user = Meteor.users.findOne(this.userId);
    if (!user.super) return;
    if (Meteor.isClient) return;

    // Need to start with the users, so when a user duplicate is found, it throws an error, and importer has a chance to replaceAll that userId in the whole data file
    const colectionNames = ['users', 'communities'].concat(userDataCollectionNames).concat(communityDataCollectionNames);
    colectionNames.forEach(name => {
      const collection = Mongo.Collection.get(name);
      data[name].forEach(obj => {
//        console.log("inserting", JSON.stringify(obj, null, 2));
        if (name === 'memberships' && obj.ownership?.share) {
          obj.ownership.share = new Fraction(obj.ownership.share.numerator, obj.ownership.share.denominator);
        }
        collection.direct.insert(obj, { validate: false, filter: false });
      });
    });
    return community;
  },
});

Communities.methods = Communities.methods || {};
_.extend(Communities.methods, { create, launch, update, close, remove, zip, unzip });
