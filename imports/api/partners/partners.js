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
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Memberships } from '/imports/api/memberships/memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Partners = new Mongo.Collection('partners');

const ContactSchema = new SimpleSchema({
  address: { type: String, optional: true },
  phone: { type: String, optional: true },
  email: _.extend({ optional: true }, SimpleSchema.Types.Email),
});

const idCardTypeValues = ['natural', 'legal'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, allowedValues: idCardTypeValues, autoform: autoformOptions(idCardTypeValues, 'schemaMemberships.person.') },
  name: { type: String, optional: true },
  address: { type: String, optional: true },
  identifier: { type: String, optional: true }, // cegjegyzek szam vagy szig szam - unique!!!
  dob: { type: Date, optional: true },  // date of birth/company formation
  mothersName: { type: String, optional: true },
  bankAccountNumber: { type: String, max: 100, optional: true },
  taxNumber: { type: String, max: 50, optional: true },
});

Partners.relationValues = ['supplier', 'customer', 'parcel'];
const chooseRelation = _.extend(
  { value: () => Session.get('activePartnerRelation') },
  autoformOptions(Partners.relationValues, 'schemaPartners.relation.')
);

Partners.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  relation: { type: String, allowedValues: Partners.relationValues, autoform: chooseRelation },
  idCard: { type: IdCardSchema, optional: true },
  contact: { type: ContactSchema, optional: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  outstanding: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } },
});


Meteor.startup(function indexPartners() {
  if (Meteor.isServer) {
    Partners._ensureIndex({ 'idCard.identifier': 1 });
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
    if (this.userId && this.user()) return this.user().emails[0].address;
    if (this.contact) return this.contact.email;
    return undefined;
  },
  avatar() {
    if (this.userId && this.user()) return this.user().avatar;
    return '/images/avatars/avatarnull.png';
  },
  getName() {
    return this.idCard && this.idCard.name;
  },
  displayName(lang) {
    if (this.idCard && this.idCard.name) return this.idCard.name;
    if (this.userId) {
      const user = this.user();
      if (user) return user.displayProfileName(lang || user.settings.language);
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
    return _.uniq(Memberships.findActive({ communityId, approved: true, partnerId: this._id }).fetch().map(m => m.role));
  },
  outstandingBills() {
    const Transactions = Mongo.Collection.get('transactions');
    return Transactions.find({ partnerId: this._id, category: 'bill', outstanding: { $gt: 0 } }).fetch();
  },
  mostOverdueDays() {
    if (this.outstanding === 0) return 0;
    const daysOfExpiring = this.outstandingBills.map(bill => bill.overdueDays());
    return Math.max.apply(Math, daysOfExpiring);
  },
  toString() {
    return this.displayName();
  },
});

Partners.attachSchema(Partners.schema);
Partners.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Partners.simpleSchema().i18n('schemaPartners');
});

Partners.publicFields = {
  'idCard.address': 0,
  'idCard.identifier': 0,
  'idCard.mothersName': 0,
  'idCard.dob': 0,
  'contact': 0,
};

Partners.nonModifiableFields = ['communityId', 'relation', 'userId', 'outstanding'];

// --- Before/after actions ---

if (Meteor.isServer) {
  Partners.after.insert(function (userId, doc) {
  });

  Partners.after.update(function (userId, doc, fieldNames, modifier, options) {
    // TODO: if partner.userId changes for any reason, the membership userId has to be changed accordingly!
    //    Memberships.update(doc._id, { $set: { userId: doc.userId } }, { selector: { role: doc.role } });
  });
}

// --- Factory ---

Factory.define('partner', Partners, {
});

Factory.define('customer', Partners, {
  relation: 'customer',
  idCard: {
    type: 'legal',
    name: () => faker.random.word(),
    bankAccountNumber: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
    taxNumber: () => faker.finance.account(6) + '-2-42',
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.demouser@honline.hu`,
  },
});

Factory.define('supplier', Partners, {
  relation: 'supplier',
  idCard: {
    type: 'legal',
    name: () => faker.random.word() + ' inc',
    bankAccountNumber: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
    taxNumber: () => faker.finance.account(6) + '-2-42',
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.demouser@honline.hu`,
  },
});

Factory.define('member', Partners, {
  relation: 'parcel',
  idCard: {
    type: 'natural',
    name: () => faker.random.word() + ' inc',
    bankAccountNumber: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
    taxNumber: () => faker.finance.account(6) + '-2-42',
  },
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => `${faker.name.firstName()}.demouser@honline.hu`,
  },
});

// ------------------------------------

export let choosePartner = {};
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
  
  choosePartner = {
    relation: 'partner',
    value() {
      const selfId = AutoForm.getFormId();
      return ModalStack.readResult(selfId, 'af.partner.insert');
    },
    options() {
      const communityId = Session.get('activeCommunityId');
      const relation = Session.get('activePartnerRelation');
      const partners = Partners.find({ communityId, relation });
      const options = partners.map(function option(p) {
        return { label: p.displayName(), value: p._id };
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
}

export let choosePerson = {};
export let chooseDelegate = {};
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

  choosePerson = {
    relation: 'partner',
    value() {
      const selfId = AutoForm.getFormId();
      return ModalStack.readResult(selfId, 'af.partner.insert');
    },
    options() {
      const communityId = Session.get('activeCommunityId');
      Session.set('activePartnerRelation', 'parcel');
      const partners = Partners.find({ communityId, relation: 'parcel' });
      const options = partners.map(function option(p) {
        return { label: (p.displayName() + ', ' + p.activeRoles(communityId).map(role => __(role)).join(', ')), value: p._id };
      });
      const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
      return sortedOptions;
    },
    firstOption: () => __('(Select one)'),
  };

  chooseDelegate = {
    relation: 'delegate',
    value() {
      const selfId = AutoForm.getFormId();
      const newDelegateId = ModalStack.readResult(selfId, 'af.delegate.insert');
      if (newDelegateId) return Memberships.findOne(newDelegateId).partnerId;
      return undefined;
    },
    ...choosePerson,
  };
}
