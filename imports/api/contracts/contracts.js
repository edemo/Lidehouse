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
      return leadParcelId && Contracts.findOne({ parcelId: leadParcelId })?.partnerId;
    } },
  },
  delegateId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id,  optional: true, autoform: { type: 'hidden', relation: '@property' } },
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
    return undefined;
  },
  partnerName() {
    return this.partner()?.displayName();
  },
  delegate() {
    if (this.delegateId) return Partners.findOne(this.delegateId);
    return undefined;
  },
  entitledToView() {
    if (!this.partnerId) return undefined;
    let partnerIds = [this.partnerId];
    if (this.relation === 'member' && this.parcelId) {
      const Memberships = Mongo.Collection.get('memberships');
      const owners = Memberships.findActive({ role: 'owner', parcelId: this.parcelId }).map(m => m.partnerId);
      partnerIds = _.union(partnerIds, owners);
    }
    return partnerIds;
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
    if (this.leadParcelId) return Contracts.findOne({ parcelId: this.leadParcelId });
    else return this;
  },
  balance() {
    const Balances = Mongo.Collection.get('balances');
    const partner = this.partnerId + '/' + this._id;
    return Balances.get({ communityId: this.communityId, partner, tag: 'T' }).total();
  },
  outstanding() {
    return this.balance() * Relations.sign(this.relation) * -1;
  },
  displayTitle() {
    return this.title || __('default');
  },
  toString() {
    if (this.relation === 'member') return `${__('property')} ${this.parcel()?.ref}`;
    else return this.displayTitle();
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

export const choosePartnerContract = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    return Contracts.partnerContractOptions({ communityId });
  },
  firstOption: () => __('(Select one)'),
};
