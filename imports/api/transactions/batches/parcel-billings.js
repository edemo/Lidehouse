import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { chooseSubAccount } from '/imports/api/transactions/account-specification.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionValues = ['absolute', 'perArea', 'perVolume', 'perHabitant'];
ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  valueDate: { type: Date },
  projection: { type: String, allowedValues: ParcelBillings.projectionValues, autoform: autoformOptions(ParcelBillings.projectionValues) },
  amount: { type: Number },
  payinType: { type: String, autoform: chooseSubAccount('Owner payin types', '', true) },
  localizer: { type: String, autoform: chooseSubAccount('Localizer', '@', false) },
  note: { type: String, max: 100, optional: true },
});

ParcelBillings.helpers({
  parcels() {
    const parcelLeafs = Localizer.get(this.communityId).leafsOf(this.localizer);
    const parcels = parcelLeafs.map(l => Parcels.findOne({ communityId: this.communityId, ref: Localizer.code2parcelRef(l.code) }));
    return parcels;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachSchema(Timestamps);

Meteor.startup(function attach() {
  ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
});
