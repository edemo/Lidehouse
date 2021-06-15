import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Topics } from '/imports/api/topics/topics.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { checkRegisteredUser, checkExists, checkNotExists, checkPermissions, checkModifier } from '../method-checks.js';

export const insert = new ValidatedMethod({
  name: 'agendas.insert',
  validate: Agendas.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Agendas, { communityId: doc.communityId, title: doc.title });
    checkPermissions(this.userId, 'agendas.insert', doc);

    return Agendas.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'agendas.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Agendas, _id);
    checkModifier(doc, modifier, ['title', 'live']);
    checkPermissions(this.userId, 'agendas.update', doc);

    Agendas.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'agendas.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Agendas, _id);
    checkPermissions(this.userId, 'agendas.remove', doc);
    const votings = Topics.find({ communityId: doc.communityId, agendaId: _id });
    if (votings.count() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Agenda cannot be deleted while it contains topics', `Found: {${votings.count()}}`);
    }
    Agendas.remove(_id);
  },
});

Agendas.methods = Agendas.methods || {};
_.extend(Agendas.methods, { insert, update, remove });
