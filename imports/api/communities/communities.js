import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { comtype } from '/imports/comtypes/comtype.js';
import { allowedOptions, imageUpload } from '/imports/utils/autoform.js';
import { displayAddress } from '/imports/localization/localization.js';
import { availableLanguages } from '/imports/startup/both/language.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Relations } from '/imports/api/core/relations.js';

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = '/images/defaulthouse.jpg';
Communities.accountingMethods = ['cash', 'accrual'];
Communities.statusValues = ['sandbox', 'live', 'official'];
Communities.availableModules = ['forum', 'voting', 'maintenance', 'finances', 'documents'];

Communities.settingsSchema = new SimpleSchema({
  modules: { type: [String], optional: true, allowedValues: Communities.availableModules, autoform: { type: 'select-checkbox', checked: true } },
  joinable: { type: Boolean, defaultValue: true },
  language: { type: String, allowedValues: availableLanguages, autoform: { firstOption: false } },
  parcelRefFormat: { type: String, optional: true },
  topicAgeDays: { type: Number, defaultValue: 90 },
  communalModeration: { type: Number, defaultValue: 0, autoform: { defaultValue() { return 0; } } },
  // accounting
  accountingMethod: { type: String, allowedValues: Communities.accountingMethods, autoform: allowedOptions() },
  subjectToVat: { type: Boolean, optional: true },
  paymentsWoStatement: { type: Boolean, optional: true },
  paymentsToBills: { type: [String], allowedValues: Relations.values, defaultValue: Relations.mainValues, autoform: { type: 'select-checkbox-inline' } },
});

Communities.schema = new SimpleSchema([{
  name: { type: String, max: 100 },
  description: { type: String, max: 1200, optional: true },
  avatar: { type: String, defaultValue: defaultAvatar, optional: true, autoform: imageUpload() },
}, comtype().profileSchema, {
  management: { type: String, optional: true, autoform: { type: 'textarea' } },
  taxNo: { type: String, max: 50, optional: true },
  totalunits: { type: Number, optional: true }, // If it is a fixed value, it is provided here
  status: { type: String, allowedValues: Communities.statusValues, defaultValue: 'live', autoform: { type: 'hidden' } },
  settings: { type: Communities.settingsSchema },
  // cached fields:
  parcels: { type: Object, blackbox: true, defaultValue: {}, autoform: { omit: true } },
  registeredUnits: { type: Number, defaultValue: 0, autoform: { omit: true } },
  billsUsed: { type: [String], defaultValue: [], allowedValues: Relations.values, autoform: { omit: true } },
}]);

Communities.listingsFields = {
  name: 1,
  parcels: 1,
};
comtype().profileSchema._schemaKeys.forEach((key) => {
  _.extend(Communities.listingsFields, { [key]: 1 });
});

Meteor.startup(function indexCommunities() {
  if (Meteor.isServer) {
    Communities._ensureIndex({ name: 1 });
    Communities._ensureIndex({ lot: 1 });
  }
});

Communities.helpers({
  officialName() {
    return this.name + ' ' + TAPi18n.__('community', {}, this.settings.language);
  },
  parcelTypeValues() {
    return Object.keys(this.parcels);
  },
  nextAvailableSerial() {
    const Parcels = Mongo.Collection.get('parcels');
    const serials = _.pluck(Parcels.find({ communityId: this._id, category: '@property' }).fetch(), 'serial');
    const maxSerial = serials.length ? Math.max(...serials) : 0;
    return maxSerial + 1;
  },
  totalUnits() {
    return this.totalunits || this.registeredUnits;
  },
  displayAddress() {
    return displayAddress(this);
  },
  asPartner() {
    const partner = _.clone(this);
    const bankAccount = this.primaryBankAccount();
    partner.name = this.officialName();
    partner.contact = { address: this.displayAddress() };
    partner.BAN = bankAccount && bankAccount.BAN;
    return { partner /* no contract */ };
  },
  accounts() {
    const Accounts = Mongo.Collection.get('accounts');
    return Accounts.find({ communityId: this._id }, { sort: { code: 1 } });
  },
  primaryBankAccount() {
    const Accounts = Mongo.Collection.get('accounts');
    const bankAccount = Accounts.findOne({ communityId: this._id, category: 'bank', primary: true });
//    if (!bankAccount) throw new Meteor.Error('err_notExixts', 'no primary bankaccount configured');
    return bankAccount;
  },
  primaryCashAccount() {
    const Accounts = Mongo.Collection.get('accounts');
    const cashAccount = Accounts.findOne({ communityId: this._id, category: 'cash', primary: true });
//    if (!cashAccount) throw new Meteor.Error('err_notExixts', 'no primary cash account configured');
    return cashAccount;
  },
  userWithRole(role) {
    const Memberships = Mongo.Collection.get('memberships');
    const membershipWithRole = Memberships.findOneActive({ communityId: this._id, role });
    if (!membershipWithRole) return undefined;
    return membershipWithRole.user();
  },
  admin() {
    const user = this.userWithRole('admin');
    productionAssert(user, 'Community was found without an admin', { id: this._id });
    return user;
  },
  treasurer() {
    return this.userWithRole('treasurer') || this.userWithRole('manager') || this.userWithRole('admin');
  },
  techsupport() {
    return this.admin(); // TODO: should be the person with do.techsupport permission
  },
  users() {
    const Memberships = Mongo.Collection.get('memberships');
    const users = Memberships.findActive({ communityId: this._id, userId: { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
  voterships() {
    const Memberships = Mongo.Collection.get('memberships');
    const voterships = Memberships.findActive({ communityId: this._id, approved: true, role: 'owner', userId: { $exists: true } })
      .fetch().filter(ownership => ownership.isVoting());
    return voterships;
  },
  voters() {
    const voters = this.voterships().map(v => v.partner());
    return _.uniq(voters, false, u => u._id);
  },
  needsJoinApproval() {
    return this.status !== 'sandbox';
  },
  hasLiveAssembly() {
    const Agendas = Mongo.Collection.get('agendas');
    return !!Agendas.findOne({ communityId: this._id, live: true });
  },
  toString() {
    return this.name;
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachBehaviour(Timestamped);

Communities.simpleSchema().i18n('schemaCommunities');

if (Meteor.isServer) {
  Communities.after.remove(function (userId, doc) {
    // cascading clean was moved to the method
  });
}

Factory.define('community', Communities, {
  name: () => faker.random.word() + 'house',
  description: () => faker.lorem.sentence(),
  zip: () => faker.random.number({ min: 1000, max: 2000 }).toString(),
  city: () => faker.address.city(),
  street: () => faker.address.streetName(),
  number: () => faker.random.number().toString(),
  lot: () => faker.finance.account(6) + '/' + faker.finance.account(4),
  avatar: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
  taxNo: () => faker.finance.account(6) + '-2-42',
  settings: {
    joinable: true,
    language: 'en',
    parcelRefFormat: 'bfdd',
    accountingMethod: 'accrual',
  },
});
