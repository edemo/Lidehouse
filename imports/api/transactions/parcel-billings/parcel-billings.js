import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns, chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { __ } from '/imports/localization/i18n.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionValues = ['absolute', 'area', 'volume', 'habitants'];
//ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.appliedAtSchema = new SimpleSchema({
  valueDate: { type: Date },
  period: { type: String, max: 7 /* check period format */ },
});

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  title: { type: String, max: 100 },
  // if consumption based
  consumption: { type: String, optional: true, allowedValues: Meters.serviceValues, autoform: autoformOptions(Meters.serviceValues, 'schemaMeters.service.') },
  uom: { type: String, max: 100, optional: true },
  unitPrice: { type: Number, decimal: true, optional: true },
  // if projection based
  projection: { type: String, optional: true, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  projectedPrice: { type: Number, optional: true },
  // ---
  payinType: { type: String, autoform: chooseSubAccount('Owner payin types', '', true) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
  note: { type: String, optional: true, autoform: { rows: 3 } },
  appliedAt: { type: [ParcelBillings.appliedAtSchema], defaultValue: [], autoform: { omit: true } },
});

let chooseParcelBilling = {};
let chooseSubAccountWithDefault = () => ({});

if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  chooseParcelBilling = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const activeParcelBillingId = Session.get('activeParcelBillingId')
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

  chooseSubAccountWithDefault = function (brk, nodeCode) {
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
  };
}

ParcelBillings.applySchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  valueDate: { type: Date, autoform: { value: new Date() } },
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
  parcels(localizer) {
    const parcelLeafs = Localizer.get(this.communityId).leafsOf(localizer || this.localizer);
    const parcels = parcelLeafs.map(l => Parcels.findOne({ communityId: this.communityId, ref: Localizer.code2parcelRef(l.code) }));
    return parcels;
  },
  projectedUom() {
    switch (this.projection) {
      case 'absolute': return '-';
      case 'area': return 'm2';
      case 'volume': return 'm3';
      case 'habitants': return 'person';
      default: debugAssert(false); return undefined;
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
    const currency = this.community().settings.currency;
    const consumptionPart = this.consumption ? `${this.unitPrice} ${currency}/${__('consumed')} ${this.uom}` : '';
    const connectionPart = (this.consumption && this.projection) ? ` ${__('or')} ` : '';
    const projectionPart = this.projection ? `${this.projectedPrice} ${currency}/${this.projectedUom()})` : '';
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
  projection: 'absolute',
  projectedPrice: faker.random.number(),
  payinType: '1',
  localizer: '@',
  note: faker.random.word(),
});
