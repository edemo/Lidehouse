import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Timestamps } from '/imports/api/timestamps.js';
import { Topics } from '/imports/api/topics/topics.js';
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
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  title: { type: String, max: 100, optional: true },
//  topicIds: { type: Array, defaultValue: [] },
//  'topicIds.$': { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseTopic },
});

Agendas.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  topics() {
//    return Topics.find({ _id: { $in: this.topicIds } }).fetch();
    return Topics.find({ communityId: this.communityId, agendaId: this._id }).fetch();
  },
  closed() {
    return _.all(this.topics(), topic => topic.closed);
  },
});

Agendas.attachSchema(Agendas.schema);
Agendas.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Agendas.simpleSchema().i18n('schemaAgendas');
});
