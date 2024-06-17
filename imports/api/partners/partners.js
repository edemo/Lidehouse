import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { allowedOptions } from '/imports/utils/autoform.js';

export const Partners = new Mongo.Collection('partners');

const ContactSchema = new SimpleSchema({
  address: { type: String, optional: true },
  phone: { type: String, optional: true },
  email: _.extend({ optional: true }, SimpleSchema.Types.Email()),
});

const idCardTypeValues = ['natural', 'legal', 'other'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, optional: true, allowedValues: idCardTypeValues, autoform: allowedOptions() },
  name: { type: String, optional: true },
  address: { type: String, optional: true },
  identifier: { type: String, optional: true }, // cegjegyzek szam vagy szig szam - unique!!!
  dob: { type: Date, optional: true },  // date of birth/company formation
  mothersName: { type: String, optional: true },
});

Partners.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  ref: { type: String, optional: true, autoform: { type: 'hidden' } },  // only used when importing from external system
  relation: { type: [String], optional: true, allowedValues: Relations.values, autoform: { type: 'select-checkbox-inline' } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  idCard: { type: IdCardSchema, optional: true },
  contact: { type: ContactSchema, optional: true },
  BAN: { type: String, max: 100, optional: true },
  taxNo: { type: String, max: 50, optional: true },
});

Partners.idSet = [
  ['communityId', 'ref'],
  ['communityId', 'userId'],
  ['communityId', 'idCard.name'],
];

Partners.publicFields = {
  'idCard.address': 0,
  'idCard.identifier': 0,
  'idCard.mothersName': 0,
  'idCard.dob': 0,
  'contact': 0,
};

Partners.nonModifiableFields = ['communityId', 'userId'];

Meteor.startup(function indexPartners() {
  if (Meteor.isServer) {
    Partners._ensureIndex({ 'contact.email': 1 }, { sparse: true });
    Partners._ensureIndex({ 'idCard.identifier': 1 }, { sparse: true });
    Partners._ensureIndex({ communityId: 1, 'idCard.name': 1 });
    Partners._ensureIndex({ communityId: 1, relation: 1 });
  }
});

Partners.code = function partnerContractCode(partnerId, contractId) { // partnerId/contractId
  let code = partnerId;
  if (contractId) code += `/${contractId}`;
  return code;
};

Partners.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  id() {
    if (this.userId) return this.userId;
    if (this.idCard) return this.idCard.identifier;
    return undefined;
  },
  user() {
    if (this.userId) return Meteor.users.findOne(this.userId);
    return undefined;
  },
  primaryEmail() {
    if (this.contact && this.contact.email) return this.contact.email;
    if (this.userId && this.user() && Meteor.isServer) return this.user().getPrimaryEmail();
    return undefined;
  },
  avatar() {
    if (this.userId && this.user()) return this.user().avatar;
    return '/images/avatars/avatarnull.png';
  },
  getName() {
    return this.idCard?.name;
  },
  isApproved() {
    return !!this.getName();
  },
  displayName(lang) {
    const name = this.getName();
    if (name) return name;
    if (this.userId) {
      const user = this.user();
//      const preText = (Meteor.isClient && Meteor.user().hasPermission('partners.update', this) && this.community().needsJoinApproval()) ?
//        `[${__('Waiting for approval')}] ` : '';
      if (user) return /* preText + */ user.displayProfileName(lang || user.settings.language);
    }
    if (this.contact && this.contact.email) {
      const emailSplit = this.contact.email.split('@');
      const emailName = emailSplit[0];
      return `[${emailName}]`;
    }
    if (this.userId && !this.user()) return __('deletedUser');
    return __('unknownUser');
  },
  getLanguage() {
    return this.user() ? this.user().settings.language : this.community().settings.language;
  },
  activeRoles() {
    const Memberships = Mongo.Collection.get('memberships');
    return _.uniq(Memberships.findActive({ communityId: this.communityId, approved: true, partnerId: this._id }).map(m => m.role));
  },
  ownerships() {
    const Memberships = Mongo.Collection.get('memberships');
    return Memberships.findActive({ communityId: this.communityId, approved: true, role: 'owner', partnerId: this._id });
  },
  contracts(relation) {
    const Contracts = Mongo.Collection.get('contracts');
    const selector = { communityId: this.communityId, relation, partnerId: this._id };
    return Contracts.findActive(Object.cleanUndefined(selector));
  },
  hasActiveContract() {
    return !!this.contracts().count();
  },
  hasActiveMemberContract() {
    return !!this.contracts('member').count();
  },
  ensureContract(relation) { // Creates one if doesn't exist
    const contracts = this.contracts(relation).fetch();
    if (contracts.length) return contracts[0];
    else {
      if (Meteor.isClient) return undefined;
      else { // if (Meteor.isServer)
        const Contracts = Mongo.Collection.get('contracts');
        const id = Contracts.insert({ communityId: this.communityId, relation, partnerId: this._id });
        return Contracts.findOne(id);
      }
    }
  },
  // --- Same for partmers and contracts ---
  balance(account) {
    // The balance of the partner from the perspective of the contra party
    // Positive means we owe him, negative means he owes us.
    // So negative if (relation === customer and has more bills than payments)
    //             or (relation === supplier and has more payments than bills)
    // Balances.get returns the Debit total, which is from the perspective of our asset sheet, so we need to flip the sign
    const Balances = Mongo.Collection.get('balances');
    // if no account is given, result is the entire balance
    const selector = Object.cleanUndefined({ communityId: this.communityId, account, partner: this._id, tag: 'T' });
    return Balances.get(selector).total() * (-1);
  },
  outstanding(account, relation = ModalStack.getVar('relation')) {
    // The outstanding amount toward the contra party that we need to settle with him
    // Positive means he has to send us this amount if he is a customer,
    //                or we need to send him this amount if he is a supplier
    // Negative means we need to return him this amount, if he is a customer
    //                or he has to return this amount to us, if he is supplier 
    return this.balance(account) * Relations.sign(relation) * (-1);
  },
  outstandingBills() {
    const Transactions = Mongo.Collection.get('transactions');
    return Transactions.find({ partnerId: this._id, category: 'bill', outstanding: { $ne: 0 } });
  },
  mostOverdueDays() {
    if (this.balance() >= 0) return 0; // we do not check suppliers, otherwise outstanding() with proper relation should be used
    const daysOfExpiring = this.outstandingBills().map(bill => bill.overdueDays());
    return daysOfExpiring.length > 0 ? Math.max.apply(Math, daysOfExpiring) : 0;
  },
  mostOverdueDaysColor() {
    const days = this.mostOverdueDays();
    if (days > 30 && days < 90) return 'warning';
    if (days > 90) return 'danger';
    return 'info';
  },
  // --- END ---
  toString() {
    return this.displayName();
  },
});

Partners.attachSchema(Partners.schema);
Partners.attachBehaviour(Timestamped);

Partners.simpleSchema().i18n('schemaPartners');

// --- Before/after actions ---

if (Meteor.isServer) {
  Partners.after.insert(function (userId, doc) {
  });

  Partners.after.update(function (userId, doc, fieldNames, modifier, options) {
    const Memberships = Mongo.Collection.get('memberships');
    if (this.previous.userId !== doc.userId) {
      const diff = rusdiff.diff(_.pick(this.previous, 'userId'), _.extend(_.pick(doc, 'userId'), { accepted: false }));
      Memberships.update({ partnerId: doc._id }, diff, { selector: { role: 'owner' }, multi: true });
    }
  });
}

Partners.mergeSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  destinationId: { type: String, regEx: SimpleSchema.RegEx.Id,
    autoform: {
      options() {
        const communityId = getActiveCommunityId();
        const thisId = AutoForm.getFieldValue('_id');
        const partners = Partners.find({ communityId, _id: { $ne: thisId } });
        return partners.map(function option(p) { return { label: p.toString(), value: p._id }; });
      },
      firstOption: () => __('(Select one)'),
    },
  },
});

Partners.mergeSchema.i18n('schemaPartners');

// --- Factory ---

Factory.define('partner', Partners, {
});

Factory.define('customer', Partners, {
  relation: ['customer'],
  idCard: {
    type: 'legal',
    name: () => faker.random.word(),
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.${faker.name.lastName()}@demo.hu`,
  },
  BAN: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  taxNo: () => faker.finance.account(6) + '-2-42',
});

Factory.define('supplier', Partners, {
  relation: ['supplier'],
  idCard: {
    type: 'legal',
    name: () => faker.random.word() + ' inc',
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.${faker.name.lastName()}@demo.hu`,
  },
  BAN: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  taxNo: () => faker.finance.account(6) + '-2-42',
});

Factory.define('member', Partners, {
  relation: ['member'],
  idCard: {
    type: 'natural',
    name: () => faker.random.word() + ' inc',
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.${faker.name.lastName()}@demo.hu`,
  },
  BAN: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  taxNo: () => faker.finance.account(6) + '-2-42',
});

// ------------------------------------

export const choosePartner = {
  relation: 'partner',
  value() {
    const selfId = AutoForm.getFormId();
    const value = ModalStack.readResult(selfId, 'af.partner.create');
    return value;
  },
  options() {
    const leadParcelId = AutoForm.getFieldValue('leadParcelId');
    if (leadParcelId) return [{ label: __('Lead parcel will be in effect'), value: '' }];
    const communityId = ModalStack.getVar('communityId');
    const community = Communities.findOne(communityId);
    const relation = AutoForm.getFieldValue('relation') || ModalStack.getVar('relation');
    const selector = { communityId, relation };
    const partners = Partners.find(Object.cleanUndefined(selector));
    const options = partners.map(function option(p) {
      return { label: (p.displayName() + ', ' + p.activeRoles().map(role => __(role)).join(', ')), value: p._id };
    });
    const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, community.settings.language, { sensitivity: 'accent' }));
    return sortedOptions;
  },
  firstOption: () => __('(Select one)'),
};

export const choosePartnerOfParcel = {
  relation: 'partner',
  options() {
    const leadParcelId = AutoForm.getFieldValue('leadParcelId');
    if (leadParcelId) return [{ label: __('Lead parcel will be in effect'), value: '' }];
    const communityId = ModalStack.getVar('communityId');
    const community = Communities.findOne(communityId);
    const parcelId = AutoForm.getFieldValue('parcelId') || ModalStack.getVar('parcelId');
    if (!parcelId) return [];
    const parcel = Parcels.findOne(parcelId);
    const partners = parcel.partners(false);
    const options = partners.map(function option(p) {
      return { label: (p.displayName() + ', ' + p.activeRoles().map(role => __(role)).join(', ')), value: p._id };
    });
    const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, community.settings.language, { sensitivity: 'accent' }));
    return sortedOptions;
  },
  firstOption: false,
};
