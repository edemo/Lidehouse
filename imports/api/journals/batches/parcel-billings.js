import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns, chooseBreakdown, leafIsParcel, digit2parcelRef } from '/imports/api/journals/breakdowns/breakdowns.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionValues = ['absolute', 'perArea', 'perVolume', 'perHabitant'];
ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  projection: { type: String, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  valueDate: { type: Date },
  amount: { type: Number },
  payinType: { type: String }, // account code
  localizer: { type: String }, // account code
  note: { type: String, max: 100, optional: true },
});

ParcelBillings.helpers({
  parcels() {
    const parcelLeafs = Breakdowns.localizer(this.communityId).leafsOf(this.localizer);
    const parcels = parcelLeafs.map(l => Parcels.findOne({ communityId: this.communityId, ref: l.code }));
    return parcels;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachSchema(Timestamps);

Meteor.startup(function attach() {
  ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
});

// Deny all client-side updates since we will be using methods to manage this collection
ParcelBillings.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
