import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Clock } from '/imports/utils/clock.js';
import { _ } from 'meteor/underscore';

// The way to add Timestamped to a Schema:
//
// Collection.schema = ... the normal schema here without timestamps
// Collection.attachSchema(Collection.schema);
// Collection.attachBehaviour(Timestamped);
//
// Deprecated: This way Timestamped are added in additon to the normal schema
// And when you validate the inserting ValidatedMethod parameters you can use
// Collection.schema.validator({ clean: true })
// so you validate against the timestamp-less schema.
// That is important because the timestamp autoValues will only be added
// when the insert, update database operations happen (done by aldeed:collection2)
//
// New way: createdAt is optional: true, so validation doesn't complain
//

// TODO: Would be advisable to refer to these fields together at Mongo projections (publicFields)
const schema = new SimpleSchema({
  createdAt: { type: Date, optional: true, denyUpdate: true, autoform: { omit: true, disabled: true } },
  creatorId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true, disabled: true } },
  updatedAt: { type: Date, optional: true, autoform: { omit: true } },
  updaterId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

const helpers = {
  creator() {
    if (!this.creatorId) return undefined;
    return Meteor.users.findOne(this.creatorId);
  },
  updater() {
    if (!this.updaterId) return undefined;
    return Meteor.users.findOne(this.updaterId);
  },
};

const hooks = {
  before: {
    insert(userId, doc) {
      doc.createdAt = Clock.currentTime();
      if (userId) doc.creatorId = userId;
      doc.updatedAt = doc.createdAt;
      doc.updaterId = doc.creatorId;
      return true;
    },
    update(userId, doc, fieldNames, modifier, options) {
      modifier.$set = modifier.$set || {};
      modifier.$set.updatedAt = Clock.currentTime();
      if (userId) modifier.$set.updaterId = userId;
      return true;
    },
  },
};

export const Timestamped = {
  schema, helpers, methods: {}, hooks,
};
