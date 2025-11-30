import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';

export const Agendas = new Mongo.Collection('agendas');

/*
const chooseTopic = {
  options() {
    return Topics.find({ category: 'vote' }).map(function option(v) {
      return { label: v.title, value: v._id };
    });
  },
};
*/

Agendas.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  live: { type: Boolean, optional: true, autoform: { type: 'hidden' } },
  title: { type: String, max: 100, optional: true },
//  topicIds: { type: Array, defaultValue: [] },
//  'topicIds.$': { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseTopic },
});

Meteor.startup(function indexAgendas() {
  if (Meteor.isServer) {
    Agendas._ensureIndex({ communityId: 1, createdAt: -1 });
  }
});

Agendas.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  topics() {
//    return Topics.find({ _id: { $in: this.topicIds } }).fetch();
    return Topics.find({ communityId: this.communityId, agendaId: this._id }).fetch();
  },
  getStatus() {
    if (!this.topics().length) return 'empty';
    return _.all(this.topics(), topic => topic.status === 'closed') ? 'closed' : 'active';
  },
  participationSheet() {
    return Votings.participationSheet(this.community(), this);
  },
});

Agendas.attachSchema(Agendas.schema);
Agendas.attachBehaviour(Timestamped);

Agendas.simpleSchema().i18n('schemaAgendas');

Factory.define('agenda', Agendas, {
  title: () => `New agenda on ${faker.random.word()}`,
});
