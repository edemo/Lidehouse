import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { comtype } from '/imports/comtypes/comtype.js';
import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { displayAddress } from '/imports/localization/localization.js';
import { availableLanguages } from '/imports/startup/both/language.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = '/images/defaulthouse.jpg';
Communities.accountingMethods = ['cash', 'accrual'];

Communities.settingsSchema = new SimpleSchema({
  joinable: { type: Boolean, defaultValue: true },
  language: { type: String, allowedValues: availableLanguages, autoform: { firstOption: false } },
  parcelRefFormat: { type: String, optional: true },
  topicAgeDays: { type: Number, decimal: true, defaultValue: 90 },
  accountingMethod: { type: String, allowedValues: Communities.accountingMethods, autoform: autoformOptions(Communities.accountingMethods, 'schemaCommunities.settings.accountingMethod.'), defaultValue: 'accrual' },
});

Communities.schema = new SimpleSchema([{
  name: { type: String, max: 100 },
  description: { type: String, max: 1200, optional: true },
  avatar: { type: String, defaultValue: defaultAvatar, optional: true, autoform: fileUpload },
}, comtype.profileSchema, {
  management: { type: String, optional: true, autoform: { type: 'textarea' } },
  taxNo: { type: String, max: 50, optional: true },
  totalunits: { type: Number },
  settings: { type: Communities.settingsSchema },
  // cached fields:
  parcels: { type: Object, blackbox: true, defaultValue: {}, autoform: { omit: true } },
}]);

Communities.publicFields = {
  totalunits: 0,
};

Meteor.startup(function indexCommunities() {
  if (Meteor.isServer) {
    Communities._ensureIndex({ name: 1 });
    Communities._ensureIndex({ lot: 1 });
  }
});

Communities.helpers({
  registeredUnits() {
    let total = 0;
    Parcels.find({ communityId: this._id, category: '@property' }).forEach(p => total += p.units);
    return total;
  },
  displayAddress() {
    return displayAddress(this);
  },
  asPartner() {
    const partner = _.clone(this);
    const bankAccount = this.primaryBankAccount();
    partner.contact = { address: this.displayAddress() };
    partner.BAN = bankAccount && bankAccount.BAN;
    return partner;
  },
  accounts() {
    return Accounts.find({ communityId: this._id });
  },
  primaryBankAccount() {
    const bankAccount = Accounts.findOne({ communityId: this._id, category: 'bank', primary: true });
//    if (!bankAccount) throw new Meteor.Error('err_notExixts', 'no primary bankaccount configured');
    return bankAccount;
  },
  primaryCashAccount() {
    const cashAccount = Accounts.findOne({ communityId: this._id, category: 'cash', primary: true });
//    if (!cashAccount) throw new Meteor.Error('err_notExixts', 'no primary cash account configured');
    return cashAccount;
  },
  userWithRole(role) {
    const membershipWithRole = Memberships.findOneActive({ communityId: this._id, role });
    if (!membershipWithRole) return undefined;
    return membershipWithRole.user();
  },
  admin() {
    const user = this.userWithRole('admin');
    productionAssert(user, `Community was found without an admin: ${this._id}`);
    return user;
  },
  treasurer() {
    return this.userWithRole('treasurer') || this.userWithRole('manager') || this.userWithRole('admin');
  },
  techsupport() {
    return this.admin(); // TODO: should be the person with do.techsupport permission
  },
  users() {
    const users = Memberships.findActive({ communityId: this._id, userId: { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
  voterships() {
    const voterships = Memberships.findActive({ communityId: this._id, approved: true, role: 'owner', userId: { $exists: true } })
      .fetch().filter(ownership => !ownership.isRepresentedBySomeoneElse());
    return voterships;
  },
  voters() {
    const voters = this.voterships().map(v => v.partner());
    return _.uniq(voters, false, u => u._id);
  },
  toString() {
    return this.name;
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Communities.simpleSchema().i18n('schemaCommunities');
});

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
  totalunits: 1000,
  settings: {
    joinable: true,
    language: 'en',
    parcelRefFormat: 'bfdd',
    accountingMethod: 'accrual',
  },
});
