import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { noUpdate } from '/imports/utils/autoform.js';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners, choosePartner, choosePartnerOfParcel } from '/imports/api/partners/partners.js';
import { Parcels, chooseParcel, chooseProperty } from '/imports/api/parcels/parcels.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

export const Contracts = new Mongo.Collection('contracts');

Contracts.accountingSchema = new SimpleSchema({
  account: { type: String /* account code */, autoform: { ...Accounts.chooseNode }, optional: true },
  localizer: { type: String /* account code */, autoform: chooseParcel(), optional: true },
});

Contracts.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  relation: { type: String, allowedValues: Relations.values, autoform: { type: 'hidden' } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...noUpdate, ...choosePartner } },
  accounting: { type: Contracts.accountingSchema, optional: true },
});

Contracts.detailsSchema = new SimpleSchema({
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000,  autoform: { rows: 8 }, optional: true },
});

Contracts.memberSchema = new SimpleSchema({
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
    autoform: { ...noUpdate, ...choosePartnerOfParcel, value: () => {
      const leadParcelId = AutoForm.getFieldValue('leadParcelId');
      return leadParcelId && Contracts.findOneActive({ parcelId: leadParcelId })?.partnerId;
    } },
  },
  delegateId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id,  optional: true, autoform: { type: () => (ModalStack.getVar('parcelId') ? 'hidden' : undefined), relation: '@property' } },
  leadParcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...noUpdate, ...chooseProperty } },
//  membershipId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  habitants: { type: Number, optional: true, autoform: { ...noUpdate } },
  approved: { type: Boolean, defaultValue: true, autoform: { omit: true } },
});

Contracts.idSet = ['parcelId'];

Contracts.modifiableFields = [
  // 'partnerId' and 'leadParcelId' are definitely not allowed to change! - you should create new Contract in that case
  'title',
  'text',
  'accounting.account',
  'accounting.localizer',
  'delegateId',
//  'habitants',
];

Contracts.publicFields = {
  // fields come from behaviours
};

Meteor.startup(function indexContracts() {
  Contracts.ensureIndex({ partnerId: 1 });
  Contracts.ensureIndex({ leadParcelId: 1 });
  if (Meteor.isServer) {
    Contracts._ensureIndex({ communityId: 1, relation: 1, active: 1 });
    Contracts._ensureIndex({ parcelId: 1, 'activeTime.end': -1 }, { sparse: true });
  } else {
    Contracts.ensureIndex({ parcelId: 1 });
  }
});

Contracts.helpers({
  entityName() {
    return 'contracts';
  },
  partner() {
    if (this.partnerId) return Partners.findOne(this.partnerId);
    if (this.leadParcelId) {
      const leadPartnerId = Contracts.findOneActive({ parcelId: this.leadParcelId })?.partnerId;
      return leadPartnerId && Partners.findOne(leadPartnerId);
    }
    return undefined;
  },
  partnerName() {
    return this.partner()?.displayName();
  },
  delegate() {
    if (this.delegateId) return Partners.findOne(this.delegateId);
    return undefined;
  },
  entitledToView(user) {
    if (!this.partnerId) return undefined;
    if (this.partner()?.userId === user._id) return true;
    if (this.delegate()?.userId === user._id) return true;
    if (this.relation === 'member' && this.parcelId) {
      const parcelDoc = Parcels.findOne(this.parcelId);
      return user.hasPermission('parcels.finances', parcelDoc);
    } else return false;
  },
  code() {
    return Partners.code(this.partnerId, this._id);
  },
  worksheets() {
    const Topics = Mongo.Collection.get('topics');
    return Topics.find({ communityId: this.communityId, categeory: 'ticket', 'ticket.contractId': this._id });
  },
//  membership() {
//    const Memberships = Mongo.Collection.get('memberships');
//    return Memberships.findOne(this.membershipId);
//  },
  parcel() {
    if (this.parcelId) return Parcels.findOne(this.parcelId);
    return undefined;
  },
  leadParcel() {
    if (this.leadParcelId) return Parcels.findOne(this.leadParcelId);
    return undefined;
  },
  predecessor() {
    if (!this.activeTime?.begin) return undefined;
    const result = Contracts.findOne({ parcelId: this.parcelId, 'activeTime.end': { $lte: this.activeTime.begin } }, { sort: { 'activeTime.end': -1 } });
    return result;
  },
  billingContract() {
    debugAssert(this.parcelId);
    if (this.leadParcelId) return Contracts.findOneActive({ parcelId: this.leadParcelId });
    else return this;
  },
  balance(account) {
    const Balances = Mongo.Collection.get('balances');
    // if no account is given, result is the entire balance
    const selector = Object.cleanUndefined({ communityId: this.communityId, account, partner: this.code(), tag: 'T' });
    return Balances.get(selector).total() * (-1);
  },
  outstanding(account) {
    return this.balance(account) * Relations.sign(this.relation) * (-1);
  },
  openingBalance(tag) {
    const Balances = Mongo.Collection.get('balances');
    return Balances.get({ communityId: this.communityId, partner: this.code(), tag }, 'opening').total() * (-1);
  },
  closingBalance(tag) {
    const Balances = Mongo.Collection.get('balances');
    return Balances.get({ communityId: this.communityId, partner: this.code(), tag }, 'closing').total() * (-1);
  },
  periodTraffic(tag) {
    const Balances = Mongo.Collection.get('balances');
    return Balances.get({ communityId: this.communityId, partner: this.code(), tag }, 'period').total() * (-1);
  },
  displayTitle() {
    return this.title || __('default');
  },
  displayFull() {
    return this.partnerName() + ': ' + this.toString();
  },
  toString() {
    if (this.relation === 'member') return `${__('property')} ${this.parcel()?.ref}`;
    else return this.displayTitle();
  },
  asOption() {
    return { label: this.toString(), value: this._id };
  },
});

Communities.helpers({
  hasLeadParcels() {
    return !!Contracts.findOne({ communityId: this._id, relation: 'member', leadParcelId: { $exists: true } });
  },
});

Contracts.attachBaseSchema(Contracts.baseSchema);
Contracts.attachBehaviour(Timestamped);
Contracts.attachBehaviour(ActivePeriod);

Contracts.attachVariantSchema(Contracts.detailsSchema, { selector: { relation: 'customer' } });
Contracts.attachVariantSchema(Contracts.detailsSchema, { selector: { relation: 'supplier' } });
Contracts.attachVariantSchema(Contracts.memberSchema, { selector: { relation: 'member' } });

Contracts.simpleSchema({ relation: 'customer' }).i18n('schemaContracts');
Contracts.simpleSchema({ relation: 'customer' }).i18n('schemaPartners');    // for relation translation

Contracts.simpleSchema({ relation: 'supplier' }).i18n('schemaContracts');
Contracts.simpleSchema({ relation: 'supplier' }).i18n('schemaPartners');    // for relation translation

Contracts.simpleSchema({ relation: 'member' }).i18n('schemaContracts');
Contracts.simpleSchema({ relation: 'member' }).i18n('schemaPartners');    // for relation translation

// ---------------------------------------

Factory.define('contract', Contracts, {
  title: () => `Contract on ${faker.random.word()}`,
});

Factory.define('memberContract', Contracts, {
  relation: 'member',
});

// ---------------------------------------

export const chooseContract = {
  relation: 'contract',
  value() {
    const selfId = AutoForm.getFormId();
    const result = ModalStack.readResult(selfId, 'af.contract.create');
    if (result) return result;
    const communityId = AutoForm.getFieldValue('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
    const selector = { communityId, relation, partnerId };
    const contractId = partnerId && Contracts.findOne(Object.cleanUndefined(selector))?._id;
    return contractId;
  },
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation') || ModalStack.getVar('relation');
    const partnerId = AutoForm.getFieldValue('partnerId') || ModalStack.getVar('partnerId');
    if (!partnerId) return [{ label: __('schemaTransactions.contractId.placeholder'), value: '' }];
    const contracts = Contracts.find({ communityId, relation, partnerId });
    const options = contracts.map(c => ({ label: c.toString(), value: c._id }));
    return options;
  },
  firstOption: false,
};

Contracts.partnerContractOptions = function partnerContractOptions(selector) {
  const partners = Partners.find(Object.cleanUndefined(selector));
  const partnerContracts = [];
  partners.forEach(p => {
    const cs = p.contracts();
    if (cs.count() > 0) {
      cs.forEach(c => {
        partnerContracts.push([p, c]);
      });
    } else partnerContracts.push([p, null]);
  });
  const options = partnerContracts.map(pc => ({
    label: Partners.code(pc[0].toString(), pc[1]?.toString()), // pc[0].toString() + (pc[1] ? `/${pc[1].toString()}` : ''),
    value: Partners.code(pc[0]._id, pc[1]?._id),
  }));
  return options;
};

Contracts.partnerContractOptionsWithAll = function partnerContractOptionsWithAll(selector) {
  const options = [{ label: __('All'), value: '' }].concat(Contracts.partnerContractOptions(selector));
  return options;
};

export const choosePartnerContract = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    return Contracts.partnerContractOptions({ communityId });
  },
  firstOption: () => __('(Select one)'),
};
