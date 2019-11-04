import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, releaseAssert } from '/imports/utils/assert.js';
import { comtype } from '/imports/comtypes/comtype.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { displayAddress } from '/imports/localization/localization.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { fileUpload } from '/imports/utils/autoform.js';

export let getActiveCommunityId = () => {
  debugAssert(false, 'On the server you need to supply the communityId, because there is no "activeCommunity"');
};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  getActiveCommunityId = function () { return Session.get('activeCommunityId'); };
}

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = '/images/defaulthouse.jpg';
Communities.accountingMethods = ['cash', 'accrual'];
Communities.bankProtocols = ['auto', 'manual'];

Communities.settingsSchema = new SimpleSchema({
  joinable: { type: Boolean, defaultValue: true },
  accountingMethod: { type: String, allowedValues: Communities.accountingMethods, autoform: autoformOptions(Communities.accountingMethods, 'schemaCommunities.settings.accountingMethod.'), defaultValue: 'accrual' },
});

Communities.bankAccountSchema = new SimpleSchema({
  name: { type: String, max: 100 },
  number: { type: String, max: 100 },
  protocol: { type: String, allowedValues: Communities.bankProtocols, autoform: autoformOptions(Communities.bankProtocols, 'schemaCommunities.settings.bankAccounts.protocol.'),  optional: true },
  primary: { type: Boolean, optional: true },
});

Communities.schema = new SimpleSchema([
  { name: { type: String, max: 100 } },
  { description: { type: String, max: 1200, optional: true } },
  { avatar: { type: String, defaultValue: defaultAvatar, optional: true, autoform: fileUpload } },
  comtype.profileSchema,
  { management: { type: String, optional: true, autoform: { type: 'textarea' } } },
  { taxNumber: { type: String, max: 50, optional: true } },
  { totalunits: { type: Number } },
  { settings: { type: Communities.settingsSchema } },
  { bankAccounts: { type: [Communities.bankAccountSchema] } },
  // redundant fields:
  { parcels: { type: Object, blackbox: true, defaultValue: {}, autoform: { omit: true } } },
]);

Meteor.startup(function indexCommunities() {
  if (Meteor.isServer) {
    Communities._ensureIndex({ name: 1 });
    Communities._ensureIndex({ lot: 1 });
  }
});

Communities.publicFields = {
  totalunits: 0,
};

Communities.helpers({
  registeredUnits() {
    let total = 0;
    Parcels.find({ communityId: this._id }).forEach(p => total += p.units);
    return total;
  },
  displayAddress() {
    return displayAddress(this);
  },
  primaryBankAccount() {
    let result;
    this.bankAccounts.forEach(bank => {
      if (bank.primary) { result = bank; return false; }
    })
    return result || this.bankAccounts[0];
  },
  asPartner() {
    const partner = _.clone(this);
    partner.contact = { address: this.displayAddress() };
    partner.bankAccountNumber = this.primaryBankAccount().number; 
    return partner;
  },
  admin() {
    const adminMembership = Memberships.findOne({ communityId: this._id, active: true, role: 'admin' });
    if (!adminMembership) return undefined;
    const adminId = adminMembership.person.userId;
    return Meteor.users.findOne(adminId);
  },
  techsupport() {
    return this.admin(); // TODO: should be the person with do.techsupport permission
  },
  users() {
    const users = Memberships.find({ communityId: this._id, active: true, 'person.userId': { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
  voterships() {
    return Memberships.find({ communityId: this._id, active: true, approved: true, role: 'owner', personId: { $exists: true } })
      .fetch().filter(ownership => !ownership.isRepresentedBySomeoneElse());
  },
  voters() {
    const voters = this.voterships().map(v => v.user());
    return _.uniq(voters, false, u => u._id);
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Communities.simpleSchema().i18n('schemaCommunities');
});

if (Meteor.isServer) {
  Communities.after.remove(function (userId, doc) {
    Mongo.Collection.getAll().forEach((collection) => {
      releaseAssert(doc._id);
      collection.instance.remove({ communityId: doc._id });
    });
  });
}

Factory.define('community', Communities, {
  name: () => faker.random.word() + 'house',
  description: () => faker.lorem.sentence(),
  zip: () => faker.random.number({ min: 1000, max: 2000 }),
  city: () => faker.address.city(),
  street: () => faker.address.streetName(),
  number: () => faker.random.number(),
  lot: () => faker.finance.account(6) + '/' + faker.finance.account(4),
  avatar: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
  taxNumber: () => faker.finance.account(6) + '-2-42',
  totalunits: 1000,
  settings: {
    joinable: true,
    accountingMethod: 'cash',
  },
  bankAccounts: [{
    name: 'bankszla',
    number: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
    primary: true,
  }],
});
