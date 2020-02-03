import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns, chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { displayMoney } from '/imports/ui_3/helpers/utils.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionBaseValues = ['absolute', 'area', 'volume', 'habitants'];
//ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.consumptionSchema = new SimpleSchema({
  service: { type: String, allowedValues: Meters.serviceValues, autoform: autoformOptions(Meters.serviceValues, 'schemaMeters.service.') },
  uom: { type: String, max: 100 },
  unitPrice: { type: Number, decimal: true },
});

ParcelBillings.projectionSchema = new SimpleSchema({
  base: { type: String, allowedValues: ParcelBillings.projectionBaseValues, autoform: autoformOptions(ParcelBillings.projectionBaseValues) },
  unitPrice: { type: Number, decimal: true },
});

ParcelBillings.appliedAtSchema = new SimpleSchema({
  date: { type: Date },
  period: { type: String, max: 7 /* TODO: check period format */ },
});

const selectFromExistingGroups = {
  options() {
    const parcels = Parcels.find({ communityId: getActiveCommunityId() }).fetch();
    const groups = _.without(_.uniq(_.pluck(parcels, 'group')), undefined);
    return groups ? groups.map(g => ({ label: g, value: g })) : [];
  },
  firstOption: () => __('All'),
};

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  title: { type: String, max: 100 },
  consumption: { type: ParcelBillings.consumptionSchema, optional: true }, // if consumption based
  projection: { type: ParcelBillings.projectionSchema, optional: true },  // if projection based
  digit: { type: String, autoform: chooseSubAccount('Owner payin types', '', true) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
  type: { type: String, optional: true, allowedValues: Parcels.typeValues, autoform: _.extend({}, autoformOptions(Parcels.typeValues), { firstOption: () => __('All') }) },
  group: { type: String, optional: true, autoform: selectFromExistingGroups },
  note: { type: String, optional: true },
  appliedAt: { type: [ParcelBillings.appliedAtSchema], defaultValue: [], autoform: { omit: true } },
});

const chooseParcelBilling = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const activeParcelBillingId = Session.get('activeParcelBillingId');
    const parcelBillings = activeParcelBillingId
      ? ParcelBillings.find(activeParcelBillingId)
      : ParcelBillings.findActive({ communityId });
    const options = parcelBillings.map(function option(pb) {
      return { label: pb.toString(), value: pb._id };
    });
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
};

function chooseSubAccountWithDefault(brk, nodeCode) {
  return {
    options() {
      const communityId = Session.get('activeCommunityId');
      const breakdown = Breakdowns.findOneByName(brk, communityId);
      return breakdown.nodeOptionsOf(nodeCode, false);
    },
    value: () => {
      const activeParcelBillingId = Session.get('activeParcelBillingId');
      const originLocalizer = activeParcelBillingId
        ? ParcelBillings.findOne(activeParcelBillingId).localizer
        : '@';
      return originLocalizer;
    },
  };
}

ParcelBillings.applySchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  date: { type: Date, autoform: { value: new Date() } },
  ids: { type: [String], optional: true, regEx: SimpleSchema.RegEx.Id, autoform: _.extend({ type: 'select-checkbox', checked: true }, chooseParcelBilling) },
  localizer: { type: String, optional: true, autoform: chooseSubAccountWithDefault('Localizer', '@') },
});

Meteor.startup(function indexParcelBillings() {
  ParcelBillings.ensureIndex({ communityId: 1 });
});

ParcelBillings.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  parcels(appliedLocalizer) {
    const localizer = appliedLocalizer || this.localizer;
    const ref = Localizer.code2parcelRef(localizer);
    const selector = { communityId: this.communityId, ref: new RegExp('^' + ref) };
    if (this.type) selector.type = this.type;
    if (this.group) selector.group = this.group;
    return Parcels.find(selector);
  },
  projectionUom() {
    switch (this.projection.base) {
      case 'absolute': return 'piece';
      case 'area': return 'm2';
      case 'volume': return 'm3';
      case 'habitants': return 'person';
      default: debugAssert(false, 'No such projection base'); return undefined;
    }
  },
  projectionQuantityOf(parcel) {
    switch (this.projection.base) {
      case 'absolute': return 1;
      case 'area': return (parcel.area || 0);
      case 'volume': return (parcel.volume || 0);
      case 'habitants': return (parcel.habitants || 0);
      default: debugAssert(false, 'No such projection base'); return undefined;
    }
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
  toString() {
    debugAssert(Meteor.isClient, 'Needs the active locale to display');
    const consumptionPart = this.consumption ? `${displayMoney(this.consumption.unitPrice)}/${__('consumed')} ${this.consumption.uom}` : '';
    const connectionPart = (this.consumption && this.projection) ? ` ${__('or')} ` : '';
    const projectionPart = this.projection ? `${displayMoney(this.projection.unitPrice)}/${this.projectionUom()})` : '';
    return `${this.title} (${consumptionPart}${connectionPart}${projectionPart})`;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachBehaviour(Timestamped);
ParcelBillings.attachBehaviour(ActivePeriod);

Meteor.startup(function attach() {
  ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
  ParcelBillings.applySchema.i18n('schemaParcelBillings');
});

Factory.define('parcelBilling', ParcelBillings, {
  title: faker.random.word(),
  projection: {
    base: 'absolute',
    unitPrice: faker.random.number(),
  },
  digit: '1',
  localizer: '@',
  note: faker.random.word(),
});
