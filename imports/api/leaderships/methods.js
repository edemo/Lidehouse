import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Leaderships } from './leaderships';

export const insert = new ValidatedMethod({
  name: 'leaderships.insert',
  validate: Leaderships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'leaderships.insert', doc.communityId);

    const LeadershipsStage = Leaderships.Stage();
    const _id = LeadershipsStage.insert(doc);
    sanityCheckOnlyOneActiveAtAllTimes(LeadershipsStage, { parcelId: doc.parcelId });
    LeadershipsStage.commit();

    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'leaderships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Leaderships, _id);
    checkModifier(doc, modifier, ['communityId'], true);

    const LeadershipsStage = Leaderships.Stage();
    const result = LeadershipsStage.update(_id, modifier);
    const newDoc = LeadershipsStage.findOne(_id);
    sanityCheckOnlyOneActiveAtAllTimes(LeadershipsStage, { parcelId: newDoc.parcelId });
    LeadershipsStage.commit();

    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'leaderships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Leaderships, _id);
    checkPermissions(this.userId, 'leaderships.remove', doc.communityId);
    Leaderships.remove(_id);
  },
});

Leaderships.methods = Leaderships.methods || {};
_.extend(Leaderships.methods, { insert, update, remove });
_.extend(Leaderships.methods, crudBatchOps(Leaderships));
