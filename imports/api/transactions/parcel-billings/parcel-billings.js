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
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { __ } from '/imports/localization/i18n.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionValues = ['absolute', 'area', 'volume', 'habitants'];
//ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  title: { type: String, max: 100 },
  // if consumption based
  consumption: { type: String, optional: true, allowedValues: Meters.serviceValues, autoform: autoformOptions(Meters.serviceValues) },
  uom: { type: String, max: 100, optional: true },
  unitPrice: { type: Number, decimal: true, optional: true },
  // if projection based
  projection: { type: String, optional: true, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  amount: { type: Number, optional: true },
  // ---
  payinType: { type: String, autoform: chooseSubAccount('Owner payin types', '', true) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
  note: { type: String, max: 100, optional: true },
  appliedAt: { type: [Date], defaultValue: [], autoform: { omit: true } },
});

let chooseParcelBilling = {};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  chooseParcelBilling = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const activeParcelBillingId = Session.get('activeParcelBillingId')
      const parcelBillings = activeParcelBillingId
        ? ParcelBillings.find(activeParcelBillingId)
        : ParcelBillings.find({ communityId, active: true });
      const options = parcelBillings.map(function option(pb) {
        return { label: pb.title, value: pb._id };
      });
      const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
      return sortedOptions;
    },
  };
}

ParcelBillings.applySchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  valueDate: { type: Date, autoform: { value: new Date() } },
  ids: { type: [String], regEx: SimpleSchema.RegEx.Id, autoform: _.extend({ type: 'select-checkbox', checked: true }, chooseParcelBilling) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
});

Meteor.startup(function indexParcelBillings() {
  ParcelBillings.ensureIndex({ communityId: 1 });
});

ParcelBillings.helpers({
  parcels(localizer) {
    const parcelLeafs = Localizer.get(this.communityId).leafsOf(localizer || this.localizer);
    const parcels = parcelLeafs.map(l => Parcels.findOne({ communityId: this.communityId, ref: Localizer.code2parcelRef(l.code) }));
    return parcels;
  },
  applyCount() {
//  return Transactions.find({ ref: this._id }).count();
    return this.appliedAt.length;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachBehaviour(Timestamped);
ParcelBillings.attachBehaviour(ActivePeriod);

Meteor.startup(function attach() {
  ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
});

Factory.define('parcelBilling', ParcelBillings, {
  title: faker.random.word(),
  projection: 'absolute',
  partner: faker.random.word(),
  amount: faker.random.number(),
  payinType: '1',
  localizer: '@',
  note: faker.random.word(),
});
