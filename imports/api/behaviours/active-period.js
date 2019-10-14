import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
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
      if (endDate && endDate < beginDate) return 'notAllowed';
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

const helpers = {
  wasActiveAt(time) {
    return (!this.activeTime.begin || this.activeTime.begin <= time)
      && (!this.activeTime.end || this.activeTime.end >= time);
  },
};

const methods = {};

const hooks = {
  before: {
    find(userId, selector, options) {
      ActiveTimeMachine.extendSelector(selector);
    },
    findOne(userId, selector, options) {
      ActiveTimeMachine.extendSelector(selector);
    },
  },
};

const indexes = [
  { active: 1 },
  { 'activeTime.begin': 1 },
  { 'activeTime.end': 1 },
];

export const ActivePeriod = {
  schema, helpers, methods, hooks, indexes,
};

ActivePeriod.fields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];

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

    if (doc.communityId) {   // TODO: figure out which permission needed
      checkPermissions(userId, `${"ownerships"}.update`, doc.communityId, doc);
    }
    checkModifier(doc, modifier, ActivePeriod.fields);

    collection.update(_id, modifier);
  },
});

methods.updateActivePeriod = updateActivePeriod;
