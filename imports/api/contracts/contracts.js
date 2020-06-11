import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { AccountingLocation } from '/imports/api/behaviours/accounting-location.js';
import { Partners, choosePartner, choosePartnerOfParcel } from '/imports/api/partners/partners.js';
import { Parcels, chooseProperty } from '/imports/api/parcels/parcels.js';

export const Contracts = new Mongo.Collection('contracts');

Contracts.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  relation: { type: String, allowedValues: Partners.relationValues, autoform: { type: 'hidden' } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: choosePartner() },
});

Contracts.detailsSchema = new SimpleSchema({
  title: { type: String, max: 100 },
  text: { type: String, max: 5000,  autoform: { rows: 8 } },
});

Contracts.memberSchema = new SimpleSchema({
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
    autoform: _.extend(choosePartnerOfParcel(), { value: () => {
      const leadParcelId = AutoForm.getFieldValue('leadParcelId');
      return leadParcelId && Contracts.findOne({ parcelId: leadParcelId })?.partnerId;
    } }),
  },
  delegateId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: choosePartner() },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id,  optional: true, autoform: { type: 'hidden', relation: '@property' } },
  leadParcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseProperty },
//  membershipId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  habitants: { type: Number, optional: true },
  approved: { type: Boolean, defaultValue: true, autoform: { omit: true } },
});

Contracts.idSet = ['parcelId'];

Meteor.startup(function indexContracts() {
  Contracts.ensureIndex({ partnerId: 1 });
  Contracts.ensureIndex({ parcelId: 1 });
  Contracts.ensureIndex({ leadParcelId: 1 });
  if (Meteor.isServer) {
    Contracts._ensureIndex({ communityId: 1, relation: 1 });
  }
});

Contracts.helpers({
  entityName() {
    return 'contracts';
  },
  partner() {
    return Partners.findOne(this.partnerId);
  },
  worksheets() {
    const Topics = Mongo.Collection.get('topics');
    return Topics.find({ communityId: this.communityId, 'ticket.contractId': this._id });
  },
  membership() {
    const Memberships = Mongo.Collection.get('memberships');
    return Memberships.findOne(this.membershipId);
  },
  parcel() {
    return Parcels.findOne(this.parcelId);
  },
  leadParcel() {
    return Parcels.findOne(this.leadParcelId);
  },
  toString() {
    if (this.relation === 'member') return this.parcel().ref;
    else return this.title;
  },
});

Contracts.attachBaseSchema(Contracts.baseSchema);
Contracts.attachBehaviour(Timestamped);
Contracts.attachBehaviour(ActivePeriod);
Contracts.attachBehaviour(AccountingLocation);

Contracts.attachVariantSchema(Contracts.detailsSchema, { selector: { relation: 'customer' } });
Contracts.attachVariantSchema(Contracts.detailsSchema, { selector: { relation: 'supplier' } });
Contracts.attachVariantSchema(Contracts.memberSchema, { selector: { relation: 'member' } });

Meteor.startup(function attach() {
  Contracts.simpleSchema({ relation: 'customer' }).i18n('schemaContracts');
  Contracts.simpleSchema({ relation: 'customer' }).i18n('schemaPartners');    // for relation translation
  Contracts.simpleSchema({ relation: 'customer' }).i18n('schemaActivePeriod');

  Contracts.simpleSchema({ relation: 'supplier' }).i18n('schemaContracts');
  Contracts.simpleSchema({ relation: 'supplier' }).i18n('schemaPartners');    // for relation translation
  Contracts.simpleSchema({ relation: 'supplier' }).i18n('schemaActivePeriod');

  Contracts.simpleSchema({ relation: 'member' }).i18n('schemaContracts');
  Contracts.simpleSchema({ relation: 'member' }).i18n('schemaPartners');    // for relation translation
  Contracts.simpleSchema({ relation: 'member' }).i18n('schemaActivePeriod');
});

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
    return ModalStack.readResult(selfId, 'af.contract.insert');
  },
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation') || ModalStack.getVar('relation');
    const partnerId = AutoForm.getFieldValue('partnerId') || ModalStack.getVar('partnerId');
    if (!partnerId) return [{ label: __('schemaTransactions.contractId.placeholder'), value: 'none' }];
    const contracts = Contracts.find({ communityId, relation, partnerId });
    const options = contracts.map(c => ({ label: c.title, value: c._id }));
    return options;
  },
  firstOption: false,
};
