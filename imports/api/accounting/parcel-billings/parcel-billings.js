import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Noted } from '/imports/api/behaviours/noted.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { ActiveTimeMachine } from '/imports/api/behaviours/active-time-machine';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { displayCurrency } from '/imports/ui_3/helpers/utils.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionBaseValues = ['absolute', 'units', 'area', 'area1', 'area2', 'area3', 'volume', 'habitants', 'YAL'];
// YAL = Year Adjusted Lateness (Late amount * Late days / 365)
//ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.projectionBaseOptions = function() {
  return {
    options() {
      const community = getActiveCommunity();
      if (!community) return [];
      const values = ['absolute'];
      if (community.hasVotingUnits()) values.push('units');
      if (community.hasPhysicalLocations()) values.push('area', 'area1', 'area2', 'area3', 'volume', 'habitants');
      if (community.settings.latePaymentFees) values.push('YAL');
      const i18Path = 'schemaParcelBillings.projection.base.options.';
      return values.map(function option(t) { return { label: __(i18Path + t), value: t }; });
    },
    firstOption: () => __('(Select one)'),
  };
}

const chooseFromExistingParcelTypes = {
  options() {
    const parcelTypes = getActiveCommunity()?.parcelTypes();
    return parcelTypes?.map(pt => ({ label: pt, value: pt })) || [];
  },
  type: 'select-checkbox',
};

const chooseFromExistingGroups = {
  options() {
    const groups = getActiveCommunity()?.parcelGroups();
    return groups?.map(g => ({ label: g, value: g })) || [];
  },
  firstOption: () => __('All'),
};

const chooseFromExistingServiceValues = {
  options() {
    const serviceValues = getActiveCommunity()?.meteredServices();
    return serviceValues?.map(s => ({ label: s, value: s })) || [];
  },
  firstOption: () => __('(Select one)'),
};

//----------------------------------------

ParcelBillings.chargeSchema = new SimpleSchema({
  uom: { type: String, max: 15 },
  unitPrice: { type: Number, decimal: true },
//  decimals: { type: Number, defaultValue: 3, max: 10 }, // how many decimals the readings accept and display
});

ParcelBillings.consumptionSchema = new SimpleSchema({
  service: { type: String, autoform: { ...chooseFromExistingServiceValues } },
  charges: { type: [ParcelBillings.chargeSchema] },
});

ParcelBillings.projectionSchema = new SimpleSchema({
  base: { type: String, allowedValues: ParcelBillings.projectionBaseValues, autoform: { ...ParcelBillings.projectionBaseOptions() } },
  unitPrice: { type: Number, decimal: true },
});
/*
ParcelBillings.lateFeeSchema = new SimpleSchema({
  base: { type: String, allowedValues: ['YAL'], autoform: { options() { return[{ label: __('schemaParcelBillings.lateFee.base.options.YAL'), value: 'YAL' }]; } } },
  unitPrice: { type: Number, decimal: true },
});
*/
ParcelBillings.appliedAtSchema = new SimpleSchema({
  date: { type: Date },
  period: { type: String, max: 7 /* TODO: check period format */ },
});

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  title: { type: String, max: 100 },
  consumption: { type: ParcelBillings.consumptionSchema, optional: true }, // if consumption based
  projection: { type: ParcelBillings.projectionSchema, optional: true },  // if projection based
//  lateFee: { type: ParcelBillings.lateFeeSchema, optional: true },  // if it is a late fee
  digit: { type: String, autoform: { ...Accounts.choosePayinType } },
  localizer: { type: String, optional: true, autoform: { ...Parcels.choosePhysical } },
  type: { type: [String], optional: true, autoform: { ...chooseFromExistingParcelTypes } },
  group: { type: String, optional: true, autoform: { ...chooseFromExistingGroups } },
  rank: { type: Number, defaultValue: 1, autoform: { defaultValue: 1 } },
  appliedAt: { type: [ParcelBillings.appliedAtSchema], defaultValue: [], autoform: { omit: true } },
});

const chooseParcelBilling = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const activeParcelBillingId = ModalStack.getVar('parcelBillingId');
    const date = AutoForm.getFieldValue('date') || new Date();
    let parcelBillings;
    ActiveTimeMachine.runAtTime(date, () => {
      parcelBillings = activeParcelBillingId
        ? ParcelBillings.find(activeParcelBillingId)
        : ParcelBillings.findActive({ communityId }, { sort: { rank: 1 } });
    });
    const options = parcelBillings.map(function option(pb) {
      return { label: pb.toString(), value: pb._id };
    });
   // const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return options;
  },
};

function chooseParcelBillingLocalizer() {
  return _.extend(Parcels.chooseSubNode('@'), {
    type: () => {
      const communityId = ModalStack.getVar('communityId');
      const community = Communities.findOne(communityId);
      return community?.hasPhysicalLocations() ? undefined : 'hidden';
    },
    value: () => {
      const activeParcelBillingId = ModalStack.getVar('parcelBillingId');
      const localizer = activeParcelBillingId
        ? ParcelBillings.findOne(activeParcelBillingId).localizer
        : undefined;
      return localizer;
    },
  });
}

ParcelBillings.applySchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  date: { type: Date, autoform: { value: new Date() } },
  ids: { type: [String], optional: true, regEx: SimpleSchema.RegEx.Id, autoform: _.extend({ type: 'select-checkbox', checked: true }, chooseParcelBilling) },
  localizer: { type: String, optional: true, autoform: chooseParcelBillingLocalizer() },
  withFollowers: { type: Boolean, optional: true, autoform: { disabled() { const loc = AutoForm.getFieldValue('localizer'); return !loc || loc === '@'; } } },
});

Meteor.startup(function indexParcelBillings() {
  ParcelBillings.ensureIndex({ communityId: 1, rank: 1 });
});

ParcelBillings.filterParcelsByLocalizer = function filterParcelsByLocalizer(communityId, localizer, withFollowers) {
  const selector = { communityId, category: { $in: ['%property', '@property'] } };
  if (localizer) selector.code = new RegExp('^' + localizer);
  let parcels = Parcels.find(selector).fetch();
  if (withFollowers) parcels = parcels.map(p => p.withFollowers()).flat(1);
  return parcels;
};

ParcelBillings.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  parcelsToBill() {
    const selector = { communityId: this.communityId, category: { $in: ['%property', '@property'] } };
    if (this.localizer) selector.code = new RegExp('^' + this.localizer);
    if (this.type) selector.type = { $in: this.type };
    if (this.group) selector.group = this.group;
    const parcels = Parcels.find(selector).fetch();
    return parcels;
  },
  projectionUom() {
    switch (this.projection.base) {
      case 'absolute': return 'piece';
      case 'units': return 'unit';
      case 'area':
      case 'area1':
      case 'area2':
      case 'area3': return 'm2';
      case 'volume': return 'm3';
      case 'habitants': return 'person';
      case 'YAL': return '%';
      default: debugAssert(false, 'No such projection base'); return undefined;
    }
  },
  projectionQuantityOf(parcel) {
    let result;
    switch (this.projection.base) {
      case 'absolute': result = 1; break;
      case 'units': result = parcel.units; break;
      case 'area': result = parcel.area; break;
      case 'area1': result = parcel.area1; break;
      case 'area2': result = parcel.area2; break;
      case 'area3': result = parcel.area3; break;
      case 'volume': result = parcel.volume; break;
      case 'habitants': result = parcel.contract()?.habitants; break;
      default: debugAssert(false, 'No such projection base'); break;
    }
    if (_.isUndefined(result)) throw new Meteor.Error('err_invalidData', 'Parcel is missing data for billing calculation', { parcelId: parcel._id, fieldName: this.projection.base });
    return result;
  },
  applyCount() {
//  return Transactions.find({ ref: this._id }).count();
    return this.appliedAt.length;
  },
  lastAppliedAt() {
    return _.last(this.appliedAt) || {};
  },
  alreadyAppliedAt(period) {
    const found = this.appliedAt.find(a => a.period === period);
    return found ? found.valueDate : undefined;
  },
  bills() {
    // WARNING: Bills are not indexed by billing.id!
    return Transactions.find({ communityId: doc.communityId, category: 'bill', 'lines.billing.id': this._id }).fetch();
  },
  toString() {
    debugAssert(Meteor.isClient, 'Needs the active locale to display');
    const consumptionPart = this.consumption ? `${displayCurrency(this.consumption.charges[0].unitPrice)}/${__('consumed')} ${this.consumption.charges[0].uom}` : '';
    const connectionPart = (this.consumption && this.projection) ? ` ${__('or')} ` : '';
    const projectionPart = this.projection ? `${displayCurrency(this.projection.unitPrice)}/${__(this.projectionUom())})` : '';
    return `${this.title} (${consumptionPart}${connectionPart}${projectionPart})`;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachBehaviour(Noted);
ParcelBillings.attachBehaviour(ActivePeriod);
ParcelBillings.attachBehaviour(Timestamped);

ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
ParcelBillings.applySchema.i18n('schemaParcelBillings');

Factory.define('parcelBilling', ParcelBillings, {
  title: faker.random.word(),
  projection: {
    base: 'absolute',
    unitPrice: faker.random.number(),
  },
  digit: '1',
  localizer: '@',
  notes: faker.random.word(),
});
