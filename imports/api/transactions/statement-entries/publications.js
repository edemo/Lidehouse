import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { StatementEntries } from './statement-entries.js';

Meteor.publish('statementEntries.byId', function statementsById(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const bs = Statements.findOne(_id);
  if (!user.hasPermission('statements.inCommunity', bs.communityId)) {
    return this.ready();
  }
  return StatementEntries.find({ _id });
});

Meteor.publish('statementEntries.byAccount', function statementsByAccount(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, account, localizer, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('statements.inCommunity', communityId)) {
    return this.ready();
  }

  const selector = { communityId, account };
  if (end) selector.beginDate = { $lte: end };
  if (begin) selector.endDate = { $gte: begin };

  return StatementEntries.find(selector);
});

Meteor.publish('statementEntries.unreconciled', function statementsUnreconciled(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('statements.inCommunity', communityId)) {
    return this.ready();
  }
  return StatementEntries.find({ communityId, reconciledId: { $exists: false } });
});