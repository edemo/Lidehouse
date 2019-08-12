import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { debugAssert } from '/imports/utils/assert.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionValues = ['absolute', 'perArea', 'perVolume', 'perHabitant'];
ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  valueDate: { type: Date, optional: true },
  projection: { type: String, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  amount: { type: Number },
  payinType: { type: String, autoform: chooseSubAccount('Owner payin types', '', true) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
  note: { type: String, max: 100, optional: true },
  appliedAt: { type: [Date], defaultValue: [] },
});

ParcelBillings.applySchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id },
  valueDate: { type: Date },
});

Meteor.startup(function indexParcelBillings() {
  ParcelBillings.ensureIndex({ communityId: 1 });
});

ParcelBillings.helpers({
  parcels() {
    const parcelLeafs = Localizer.get(this.communityId).leafsOf(this.localizer);
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

Meteor.startup(function attach() {
  ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
});

Factory.define('parcelBilling', ParcelBillings, {
  partner: faker.random.word(),
  projection: 'absolute',
  amount: faker.random.number(),
  payinType: '1',
  localizer: '@',
  note: faker.random.word(),
});