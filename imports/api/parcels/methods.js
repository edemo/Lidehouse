import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Parcels } from './parcels.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '../memberships/memberships.js';
import { checkExists, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    const total = Communities.findOne({ _id: doc.communityId }).registeredUnits();
    const newTotal = total + doc.units;
    const totalunits = Communities.findOne({ _id: doc.communityId }).totalunits;
    if (newTotal > totalunits) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
      `Registered units: ${total}/${totalunits}, With new unit: ${newTotal}/${totalunits}`);
    };
    return Parcels.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'parcels.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Parcels, _id);
    checkModifier(doc, modifier, ['serial', 'units', 'floor', 'number', 'type', 'lot', 'area', 'volume', 'habitants']);
    const total = Communities.findOne({ _id: doc.communityId }).registeredUnits();
    const newTotal = (total - doc.units) + modifier.$set.units;
    const totalunits = Communities.findOne({ _id: doc.communityId }).totalunits;
    if (newTotal > totalunits) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Registered units cannot exceed totalunits of community',
      `Registered units: ${total}/${totalunits}, With new unit: ${newTotal}/${totalunits}`);
    };
    Parcels.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'parcels.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    Parcels.remove(_id);
    Memberships.remove({ parcelId: _id });
  },
});
