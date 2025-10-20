import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { dateSelector } from '/imports/api/utils.js';
import { StatementEntries } from './statement-entries.js';

Meteor.publish('statementEntries.byId', function statementsById(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const doc = StatementEntries.findOne(_id);
  if (!user.hasPermission('statements.inCommunity', doc)) {
    return this.ready();
  }
  return StatementEntries.find({ _id });
});

Meteor.publish('statementEntries.inCommunity', function statementsByAccount(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, account, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('statements.inCommunity', { communityId })) {
    return this.ready();
  }

  const selector = { communityId };
  if (account) selector.account = account;
  const valueDate = dateSelector(begin, end);
  if (valueDate) selector.valueDate = valueDate;

  return StatementEntries.find(selector);
});
/*
Meteor.publish('statementEntries.unreconciled', function statementsUnreconciled(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('statements.inCommunity', { communityId })) {
    return this.ready();
  }
  return StatementEntries.find({ communityId, txId: { $exists: false } });
});
*/