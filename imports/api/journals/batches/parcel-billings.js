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
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  projection: { type: String, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  amount: { type: Number },
  payinType: { type: String }, // account code
  localizer: { type: String }, // account code
  year: { type: Number },
  month: { type: String, optional: true, allowedValues: ParcelBillings.monthValues, autoform: autoformOptions(ParcelBillings.monthValues) },
  note: { type: String, max: 100, optional: true },
});

ParcelBillings.helpers({
  parcels() {
    const localizerTree = Breakdowns.findOneByName('Localizer', this.communityId);
//    console.log('nodeName', nodeName);
    const leafs = localizerTree.leafsOf(this.localizer);
//    console.log('leafs', leafs);
    const parcelLeafs = leafs.filter(l => leafIsParcel(l));
//    console.log('parcelLeafs', parcelLeafs);
    const parcels = parcelLeafs.map(l => Parcels.findOne({ communityId: this.communityId, ref: digit2parcelRef(l.digit) }));
//    console.log('parcels', parcels);
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
