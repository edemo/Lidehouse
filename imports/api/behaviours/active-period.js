import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { ActiveTimeMachine } from './active-time-machine';

const TimePeriodSchema = new SimpleSchema({
  begin: { type: Date, optional: true,
    custom() {
      const beginDate = this.value;
      const endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      if (!beginDate && endDate) return 'required';
      if (beginDate && beginDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
  end: { type: Date, optional: true,
    custom() {
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.value;
      const nowDate = new Date();
      if (endDate && endDate <= beginDate) return 'notAllowed';
      if (endDate && endDate > nowDate) return 'notAllowed';  // We can allow this if needed, if we set up a timer
      return undefined;
    },
  },
});

const schema = new SimpleSchema({
  activeTime: { type: TimePeriodSchema, optional: true },
  active: { type: Boolean, autoform: { omit: true },
    autoValue() {
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      if (this.isUpdate && !beginDate && !endDate) return undefined;
        // If we have one of those set (begin or end) then both should be set
        // - autoform does that - and if you call update by hand, make sure you do that too!
      return (!beginDate || beginDate <= nowDate) && (!endDate || nowDate <= endDate);
    },
  },
});
schema.i18n('schemaActivePeriod');

const helpers = {
  wasActiveAt(time) {
    return (!this.activeTime.begin || this.activeTime.begin <= time)
      && (!this.activeTime.end || this.activeTime.end >= time);
  },
  getActiveTime() {
    const result = _.extend({}, this.activeTime);
    const now = new Date();
    const epoch = new Date(0);
    result.begin = result.begin || epoch;
    result.end = result.end || now;
    return result;
  },
};

const methods = {};

const hooks = {};
// Hooking into find and findOne did not work, because update and remove calls find and so it was not possible to
// remove non-active docs, only with direct.remove, which then doesn't perform other hooks that might be needed

Mongo.Collection.prototype.findActive = function findActive(selector, options) {
  if (selector.active || selector.activeTime) {
    return this.find(selector, options);
  }
  if (typeof selector == 'string') selector = { _id: selector };
  const timedSelector = _.extend(ActiveTimeMachine.selector(), selector);
  return this.find(timedSelector, options);
};

Mongo.Collection.prototype.findOneActive = function findOneActive(selector, options) {
  if (selector.active || selector.activeTime) {
    return this.findOne(selector, options);
  }
  if (typeof selector == 'string') selector = { _id: selector };
  const timedSelector = _.extend(ActiveTimeMachine.selector(), selector);
  return this.findOne(timedSelector, options);
};

const indexes = function indexActivePeriod(collection) {
//  collection.ensureIndex({ active: 1 });
//  if (Meteor.isServer) {
//    collection._ensureIndex({ 'activeTime.end': 1 }, { sparse: true });
//  }
};

export const ActivePeriod = { name: 'ActivePeriod',
  schema, helpers, methods, hooks, /*indexes,*/
};

ActivePeriod.fields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];

ActivePeriod.modifiableFields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];

export function sanityCheckOnlyOneActiveAtAllTimes(collection, selector) {
  const docs = collection.find(selector, { sort: { 'activeTime.end': 1 } });
  docs.forEach((doc, i) => {
    debugAssert(doc.getActiveTime().end > doc.getActiveTime().begin, 'End should be after Begin', { doc });
    if (!docs[i + 1]) return;
    if (doc.getActiveTime().end > docs[i + 1].getActiveTime().begin) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Cannot have two documents active at the same time', { time: doc.getActiveTime().end, doc1: docs[i + 1], doc2: doc });
    }
  });
}

export function sanityCheckAtLeastOneActive(collection, selector) {
  const actives = collection.findActive(selector);
  if (actives.count() === 0) {
    throw new Meteor.Error('err_unableToRemove', 'The last one cannot be deleted',
    `Found: {${actives.count()}}`);
  }
}

// deprecated because of lack of sanity checks, call collection.update instead
const updateActivePeriod = new ValidatedMethod({
  name: 'updateActivePeriod',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),
  run({ _id, modifier }) {
    const collectionName = this.name.split('.')[0];
    const collection = Mongo.Collection.get(collectionName);
    const doc = checkExists(collection, _id);
    const userId = this.userId;
    const entity = doc.entityName ? doc.entityName() : collectionName;

    if (doc.communityId) {   // TODO: figure out which permission needed
      checkPermissions(userId, `${entity}.update`, doc);
    }
    checkModifier(doc, modifier, ActivePeriod.fields);

    collection.update(_id, modifier, { selector: doc });
  },
});

methods.updateActivePeriod = updateActivePeriod;
