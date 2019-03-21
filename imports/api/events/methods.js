import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Events } from './events.js';
import { Topics } from '../topics/topics.js';
import { checkExists, checkPermissions, checkModifier } from '../method-checks';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

export const insert = new ValidatedMethod({
  name: 'events.insert',
  validate: Events.simpleSchema().validator({ clean: true }),

  run(doc) {
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.type}.insert`, topic.communityId);
    doc.userId = this.userId;   // One can only post in her own name
    const docId = Events.insert(doc);
    const newDoc = Events.findOne(docId); // we need the createdAt timestamp from the server
    updateMyLastSeen._execute({ userId: this.userId },
    { topicId: topic._id, lastSeenInfo: { timestamp: newDoc.createdAt } });
    return newDoc;
  },
});

export const update = new ValidatedMethod({
  name: 'events.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Events, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkModifier(doc, modifier, ['text'] /***/); // only the text can be modified
    checkPermissions(this.userId, `${doc.category}.update`, topic.communityId, doc);

    Events.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'events.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Events, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.category}.remove`, topic.communityId, doc);

    Events.remove(_id);
  },
});

Events.methods = {
  insert, update, remove,
};
