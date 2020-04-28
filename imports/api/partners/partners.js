import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { AccountingLocation } from '/imports/api/behaviours/accounting-location.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { autoformOptions } from '/imports/utils/autoform.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Partners = new Mongo.Collection('partners');

const ContactSchema = new SimpleSchema({
  address: { type: String, optional: true },
  phone: { type: String, optional: true },
  email: _.extend({ optional: true }, SimpleSchema.Types.Email),
});

const idCardTypeValues = ['natural', 'legal'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, allowedValues: idCardTypeValues },
  name: { type: String, optional: true },
  address: { type: String, optional: true },
  identifier: { type: String, optional: true }, // cegjegyzek szam vagy szig szam - unique!!!
  dob: { type: Date, optional: true },  // date of birth/company formation
  mothersName: { type: String, optional: true },
});

Partners.relationValues = ['supplier', 'customer', 'member'];

Partners.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  relation: { type: [String], allowedValues: Partners.relationValues, autoform: { type: 'select-checkbox-inline' } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  idCard: { type: IdCardSchema, optional: true },
  contact: { type: ContactSchema, optional: true },
  BAN: { type: String, max: 100, optional: true },
  taxNo: { type: String, max: 50, optional: true },
});

Partners.idSet = ['communityId', 'userId', 'idCard.name'];

Partners.publicFields = {
  'idCard.address': 0,
  'idCard.identifier': 0,
  'idCard.mothersName': 0,
  'idCard.dob': 0,
  'contact': 0,
};

Partners.nonModifiableFields = ['communityId', 'userId', 'outstanding'];


Meteor.startup(function indexPartners() {
  if (Meteor.isServer) {
    Partners._ensureIndex({ 'contact.email': 1 }, { sparse: true });
    Partners._ensureIndex({ 'idCard.identifier': 1 }, { sparse: true });
    Partners._ensureIndex({ communityId: 1, 'idCard.name': 1 });
    Partners._ensureIndex({ communityId: 1, relation: 1, outstanding: -1 });
  }
});


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
    return this.idCard && this.idCard.name;
  },
  isApproved() {
    return !!this.getName();
  },
  displayName(lang) {
    if (this.idCard && this.idCard.name) return this.idCard.name;
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
  activeRoles(communityId) {
    const Memberships = Mongo.Collection.get('memberships');
    return _.uniq(Memberships.findActive({ communityId, approved: true, partnerId: this._id }).map(m => m.role));
  },
  outstandingBills() {
    const Transactions = Mongo.Collection.get('transactions');
    return Transactions.find({ partnerId: this._id, category: 'bill', outstanding: { $gt: 0 } });
  },
  mostOverdueDays() {
    if (this.outstanding === 0) return 0;
    const daysOfExpiring = this.outstandingBills().map(bill => bill.overdueDays());
    return Math.max.apply(Math, daysOfExpiring);
  },
  mostOverdueDaysColor() {
    const days = this.mostOverdueDays();
    if (days > 30 && days < 90) return 'warning';
    if (days > 90) return 'danger';
    return 'info';
  },
  toString() {
    return this.displayName();
  },
});

Partners.attachSchema(Partners.schema);
Partners.attachBehaviour(AccountingLocation);
Partners.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Partners.simpleSchema().i18n('schemaPartners');
});

// --- Before/after actions ---

if (Meteor.isServer) {
  Partners.after.insert(function (userId, doc) {
  });

  Partners.after.update(function (userId, doc, fieldNames, modifier, options) {
    const Memberships = Mongo.Collection.get('memberships');
    if (modifier.$set && modifier.$set.userId && modifier.$set.userId !== this.previous.userId) {
      Memberships.update({ partnerId: doc._id }, { $set: { userId: modifier.$set.userId } }, { selector: { role: doc.role }, multi: true });
    } else if (this.previous.userId && modifier.$unset && 'userId' in modifier.$unset) {
      Memberships.update({ partnerId: doc._id }, { $unset: { userId: '' } }, { selector: { role: doc.role }, multi: true });
    }
  });
}

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

export let choosePartner = {};
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

  choosePartner = {
    relation: 'partner',
    value() {
      const selfId = AutoForm.getFormId();
      const value = ModalStack.readResult(selfId, 'af.partner.insert');
      return value;
    },
    options() {
      const communityId = Session.get('activeCommunityId');
      const community = Communities.findOne(communityId);
      const txdef = Session.get('modalContext').txdef;
      const relation = (txdef && txdef.data.relation) || Session.get('activePartnerRelation');
      const partners = Partners.find({ communityId, relation });
      const options = partners.map(function option(p) {
        return { label: (p.displayName() + ', ' + p.activeRoles(communityId).map(role => __(role)).join(', ')), value: p._id };
      });
      const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, community.settings.language, { sensitivity: 'accent' }));
      return sortedOptions;
    },
    firstOption: () => __('(Select one)'),
  };
}
